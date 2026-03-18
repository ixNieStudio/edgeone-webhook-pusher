/**
 * Message Service - 消息历史记录管理
 * 
 * 支持按渠道、应用、用户、方向筛选消息历史
 */

import { messagesKV } from '../shared/kv-client.js';
import type {
  Message,
  MessageDeliverySummary,
  MessageDirection,
  MessageDetailView,
  MessageListItem,
  MessageListStats,
  MessageWorkspaceResponse,
} from '../types/index.js';
import { KVKeys, LegacyKVKeys } from '../types/index.js';
import { adminIndexService } from './admin-index.service.js';
import { appService } from './app.service.js';
import { openidService } from './openid.service.js';

interface ListOptions {
  page?: number;
  pageSize?: number;
  channelId?: string;
  appId?: string;
  openId?: string;
  direction?: MessageDirection;
  startDate?: string;
  endDate?: string;
}

interface ListResult {
  messages: Message[];
  total: number;
  page: number;
  pageSize: number;
}

interface Stats {
  total: number;
  today: number;
  inbound: number;
  outbound: number;
  success: number;
  failed: number;
}

interface MessageIndexMeta {
  version: number;
  rebuiltAt: string;
  total: number;
}

interface MessageIndexCollection {
  global: string[];
  globalHead: string[];
  globalCount: number;
  apps: Map<string, string[]>;
  appHeads: Map<string, string[]>;
  appCounts: Map<string, number>;
}

interface MessageIndexDescriptor {
  fullKey: string;
  headKey: string;
  countKey: string;
  requiresRepairOnMissing: boolean;
  limit: number;
  isGlobal: boolean;
}

type MessageSummaryRecord = MessageListItem;

const GLOBAL_INDEX_LIMIT = 10000;
const APP_INDEX_LIMIT = 5000;
const MESSAGE_INDEX_VERSION = 1;
const MESSAGE_HEAD_INDEX_LIMIT = 200;

/**
 * 批量处理 Promise，避免并发过多
 * 适用于 EdgeOne 环境，防止同时发起过多 HTTP 请求
 *
 * @param items 待处理的项目数组
 * @param processor 处理函数
 * @param batchSize 每批处理的数量（默认 50）
 */
async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 50
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

class MessageService {
  private rebuildIndexesPromise: Promise<void> | null = null;

  private async loadMessagesByKeys(keys: string[]): Promise<Array<Message | null>> {
    if (keys.length === 0) {
      return [];
    }

    const messageMap = await messagesKV.getMany<Message>(keys);
    return keys.map((key) => messageMap[key] ?? null);
  }

  /**
   * 保存消息记录
   */
  async saveMessage(
    message: Message,
    options?: {
      // 轻量模式：仅保存消息详情，不维护 msg_list/msg_channel/msg_app/msg_openid 索引
      skipIndexes?: boolean;
    }
  ): Promise<void> {
    const skipIndexes = options?.skipIndexes === true;

    // 保存消息记录
    const summary = this.toMessageSummaryRecord(message);
    await messagesKV.putMany<unknown>([
      { key: KVKeys.MESSAGE(message.id), value: message },
      { key: KVKeys.MESSAGE_SUMMARY(message.id), value: summary },
    ]);

    // 轻量模式会导致列表查询无法命中索引，删除元数据以便后续查询触发自修复
    if (skipIndexes) {
      await this.markIndexesNeedsRebuild();
      return;
    }

    await this.addMessageToIndexes(message);
  }

  /**
   * 获取消息详情
   */
  async get(id: string): Promise<Message | null> {
    return messagesKV.get<Message>(KVKeys.MESSAGE(id));
  }

  async listSummaries(options: ListOptions = {}, baseUrl: string): Promise<MessageWorkspaceResponse> {
    const { page = 1, pageSize = 20, channelId, appId, openId, direction, startDate, endDate } = options;
    const [appFilters, pageResult] = await Promise.all([
      this.getFilterApps(baseUrl),
      !direction && !startDate && !endDate && !channelId && !openId
        ? this.getIndexedPage(this.getIndexDescriptor({ appId }), page, pageSize)
        : Promise.resolve(null),
    ]);
    const appNameById = new Map(appFilters.map((item) => [item.id, item.name]));

    if (pageResult) {
      const items = await this.loadListItems(pageResult.ids, appNameById);
      return {
        items,
        pagination: {
          total: pageResult.total,
          page,
          pageSize,
          totalPages: Math.ceil(pageResult.total / pageSize),
        },
        stats: this.buildListStats(items, pageResult.total),
        filters: {
          apps: appFilters,
        },
      };
    }

    const result = await this.list(options);
    const items = result.messages.map((message) => this.toMessageListItem(message, appNameById));

    return {
      items,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
      stats: this.buildListStats(items, result.total),
      filters: {
        apps: appFilters,
      },
    };
  }

  async getDetail(id: string, baseUrl: string): Promise<MessageDetailView | null> {
    const message = await this.get(id);
    if (!message) {
      return null;
    }

    const detail: MessageDetailView = {
      ...message,
      previewText: this.buildPreviewText(message),
      delivery: this.getDeliverySummary(message),
    };

    if (message.appId && !message.appName) {
      const appSummary = await adminIndexService.getAppSummaryById(message.appId, baseUrl);
      if (appSummary) {
        detail.appName = appSummary.name;
      } else {
        const app = await appService.getById(message.appId);
        if (app) {
          detail.appName = app.name;
        }
      }
    }

    if (message.direction === 'inbound' && message.openId && message.channelId && (!message.userNickname || !message.userAvatar)) {
      const channelApps = await appService.listByChannel(message.channelId);
      if (channelApps.length > 0) {
        const records = await Promise.all(
          channelApps.map((app) => openidService.findByOpenId(app.id, message.openId!))
        );
        const matched = records.find((record) => record && (record.nickname || record.avatar));
        if (matched) {
          detail.userNickname = matched.nickname;
          detail.userAvatar = matched.avatar;
        }
      }
    }

    return detail;
  }

  /**
   * 分页查询消息历史（优化版 - 只查询当前页数据）
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    const { page = 1, pageSize = 20, channelId, appId, openId, direction, startDate, endDate } = options;
    const indexDescriptor = this.getIndexDescriptor({ appId });

    if (!direction && !startDate && !endDate) {
      const pageResult = await this.getIndexedPage(indexDescriptor, page, pageSize);
      if (pageResult.total === 0) {
        return { messages: [], total: 0, page, pageSize };
      }

      const messageMap = await messagesKV.getMany<Message>(pageResult.ids.map((id) => KVKeys.MESSAGE(id)));
      const messages = pageResult.ids
        .map((id) => messageMap[KVKeys.MESSAGE(id)] ?? null)
        .filter((message): message is Message => message !== null);

      return { messages, total: pageResult.total, page, pageSize };
    }

    const ids = await this.getFullIndexIds(indexDescriptor);
    if (ids.length === 0) {
      return { messages: [], total: 0, page, pageSize };
    }

    const batchSize = 100;
    const allMessages: Message[] = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batchMap = await messagesKV.getMany<Message>(batchIds.map((id) => KVKeys.MESSAGE(id)));
      batchIds.forEach((id) => {
        const data = batchMap[KVKeys.MESSAGE(id)] ?? null;
        if (data) {
          allMessages.push(data);
        }
      });

      // 如果已经收集到足够多的消息（超过当前页需要的数量），可以提前停止
      // 但由于需要筛选，我们还是需要继续查询
    }

    // 筛选
    let filtered = allMessages;

    // 按渠道筛选（如果不是通过渠道索引获取的）
    if (channelId && !openId && !appId) {
      // 已经通过渠道索引获取，无需再筛选
    } else if (channelId) {
      filtered = filtered.filter((m) => m.channelId === channelId);
    }

    // 按应用筛选（如果不是通过应用索引获取的）
    if (appId && openId) {
      filtered = filtered.filter((m) => m.appId === appId);
    }

    // 按方向筛选
    if (direction) {
      filtered = filtered.filter((m) => m.direction === direction);
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((m) => new Date(m.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((m) => new Date(m.createdAt) <= end);
    }

    // 按时间倒序排序
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 分页
    const total = filtered.length;
    const startIdx = (page - 1) * pageSize;
    const messages = filtered.slice(startIdx, startIdx + pageSize);

    return { messages, total, page, pageSize };
  }

  /**
   * 按应用获取消息列表
   */
  async listByApp(appId: string, options: Omit<ListOptions, 'appId'> = {}): Promise<ListResult> {
    return this.list({ ...options, appId });
  }

  /**
   * 按渠道获取消息列表
   */
  async listByChannel(channelId: string, options: Omit<ListOptions, 'channelId'> = {}): Promise<ListResult> {
    return this.list({ ...options, channelId });
  }

  /**
   * 按用户获取消息列表
   */
  async listByOpenId(openId: string, options: Omit<ListOptions, 'openId'> = {}): Promise<ListResult> {
    return this.list({ ...options, openId });
  }

  /**
   * 删除消息记录
   */
  async delete(id: string): Promise<boolean> {
    const data = await this.get(id);
    if (!data) return false;

    await messagesKV.deleteMany([
      KVKeys.MESSAGE(id),
      KVKeys.MESSAGE_SUMMARY(id),
    ]);
    await this.removeMessageFromIndexes(data);
    return true;
  }

  /**
   * 清理过期记录
   * 每次最多处理 20 条消息，避免一次性加载过多数据
   */
  async cleanup(retentionDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // 使用分页，每次最多获取 20 条
    const result = await messagesKV.list(KVKeys.MESSAGE_PREFIX, 20);
    const keys = result.keys;

    // 批量获取消息（每批 50 个），避免并发过多
    const messageRecords = await batchProcess(
      chunkItems(keys, 50),
      (batch) => this.loadMessagesByKeys(batch),
      1
    );
    const flatMessages = messageRecords.flat();

    // 找出需要删除的消息
    const toDelete: string[] = [];
    const expiredMessages: Message[] = [];
    flatMessages.forEach((data, index) => {
      if (data && new Date(data.createdAt) < cutoff) {
        toDelete.push(keys[index]);
        expiredMessages.push(data);
      }
    });

    // 批量删除过期消息（每批 50 个）
    await batchProcess(
      toDelete,
      async (key) => {
        const id = key.slice(KVKeys.MESSAGE_PREFIX.length);
        await messagesKV.deleteMany([
          key,
          KVKeys.MESSAGE_SUMMARY(id),
        ]);
      },
      50
    );

    await batchProcess(
      expiredMessages,
      message => this.removeMessageFromIndexes(message),
      10
    );

    return expiredMessages.length;
  }

  /**
   * 获取统计数据
   * 只统计最近 20 条消息，避免一次性加载过多数据
   */
  async getStats(): Promise<Stats> {
    await this.ensureIndexesReady();
    const meta = await messagesKV.get<MessageIndexMeta>(KVKeys.MESSAGE_INDEX_META);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 使用分页，每次最多获取 20 条
    const result = await messagesKV.list(KVKeys.MESSAGE_PREFIX, 20);
    const keys = result.keys;

    // 批量获取消息（每批 50 个），避免并发过多
    const messageRecords = await batchProcess(
      chunkItems(keys, 50),
      (batch) => this.loadMessagesByKeys(batch),
      1
    );
    const messages = messageRecords.flat();

    let total = meta?.total ?? 0;
    let todayCount = 0;
    let inbound = 0;
    let outbound = 0;
    let success = 0;
    let failed = 0;

    for (const data of messages) {
      if (data) {
        if (new Date(data.createdAt) >= today) {
          todayCount++;
        }

        // 统计方向
        if (data.direction === 'inbound') {
          inbound++;
        } else {
          outbound++;
        }

        // 统计成功/失败（仅发出的消息）
        if (data.results) {
          for (const r of data.results) {
            if (r.success) {
              success++;
            } else {
              failed++;
            }
          }
        }
      }
    }

    return { total, today: todayCount, inbound, outbound, success, failed };
  }

  async getTotalCount(): Promise<number> {
    const count = await messagesKV.get<number>(KVKeys.MESSAGE_COUNT);
    if (typeof count === 'number') {
      return count;
    }

    await this.ensureIndexesReady();
    return (await messagesKV.get<number>(KVKeys.MESSAGE_COUNT)) ?? 0;
  }

  private getIndexDescriptor(filters: Pick<ListOptions, 'appId'>): MessageIndexDescriptor {
    const { appId } = filters;
    if (appId) {
      return {
        fullKey: KVKeys.MESSAGE_APP(appId),
        headKey: KVKeys.MESSAGE_APP_HEAD(appId),
        countKey: KVKeys.MESSAGE_APP_COUNT(appId),
        requiresRepairOnMissing: false,
        limit: APP_INDEX_LIMIT,
        isGlobal: false,
      };
    }

    return {
      fullKey: KVKeys.MESSAGE_LIST,
      headKey: KVKeys.MESSAGE_LIST_HEAD,
      countKey: KVKeys.MESSAGE_COUNT,
      requiresRepairOnMissing: true,
      limit: GLOBAL_INDEX_LIMIT,
      isGlobal: true,
    };
  }

  private async getIndexedPage(
    descriptor: MessageIndexDescriptor,
    page: number,
    pageSize: number
  ): Promise<{ ids: string[]; total: number }> {
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const canUseHead = endIdx <= MESSAGE_HEAD_INDEX_LIMIT;
    let cachedCount: number | null = null;

    if (canUseHead) {
      const keyMap = await messagesKV.getMany<string[] | number>([
        descriptor.headKey,
        descriptor.countKey,
      ]);
      const headIds = keyMap[descriptor.headKey];
      const count = keyMap[descriptor.countKey];

      if (Array.isArray(headIds) && typeof count === 'number') {
        return {
          ids: headIds.slice(startIdx, endIdx),
          total: count,
        };
      }

      cachedCount = typeof count === 'number' ? count : null;
    }

    const fullIds = await this.getFullIndexIds(descriptor);
    if (fullIds.length === 0) {
      return { ids: [], total: 0 };
    }

    const total = cachedCount ?? fullIds.length;
    if (canUseHead) {
      void Promise.all([
        messagesKV.put(descriptor.headKey, fullIds.slice(0, MESSAGE_HEAD_INDEX_LIMIT)),
        cachedCount === null ? messagesKV.put(descriptor.countKey, fullIds.length) : Promise.resolve(),
      ]);
    }

    return {
      ids: fullIds.slice(startIdx, endIdx),
      total,
    };
  }

  private async getFullIndexIds(descriptor: MessageIndexDescriptor): Promise<string[]> {
    let ids = await messagesKV.get<string[]>(descriptor.fullKey);
    if (ids) {
      return ids;
    }

    if (!descriptor.requiresRepairOnMissing) {
      return [];
    }

    await this.ensureIndexesReady();
    ids = await messagesKV.get<string[]>(descriptor.fullKey);
    return ids || [];
  }

  private async addMessageToIndexes(message: Message): Promise<void> {
    await Promise.all(
      this.getIndexDescriptors(message).map(({ fullKey, headKey, countKey, limit, isGlobal }) =>
        this.prependIndexId(fullKey, headKey, countKey, message.id, limit, isGlobal)
      )
    );
  }

  private async removeMessageFromIndexes(message: Message): Promise<void> {
    await Promise.all(
      this.getIndexDescriptors(message).map(({ fullKey, headKey, countKey, isGlobal }) =>
        this.removeIndexId(fullKey, headKey, countKey, message.id, isGlobal)
      )
    );
  }

  private getIndexDescriptors(message: Message): MessageIndexDescriptor[] {
    const descriptors: MessageIndexDescriptor[] = [
      {
        fullKey: KVKeys.MESSAGE_LIST,
        headKey: KVKeys.MESSAGE_LIST_HEAD,
        countKey: KVKeys.MESSAGE_COUNT,
        limit: GLOBAL_INDEX_LIMIT,
        isGlobal: true,
        requiresRepairOnMissing: true,
      },
    ];

    if (message.appId) {
      descriptors.push({
        fullKey: KVKeys.MESSAGE_APP(message.appId),
        headKey: KVKeys.MESSAGE_APP_HEAD(message.appId),
        countKey: KVKeys.MESSAGE_APP_COUNT(message.appId),
        limit: APP_INDEX_LIMIT,
        isGlobal: false,
        requiresRepairOnMissing: false,
      });
    }

    return descriptors;
  }

  private async prependIndexId(
    fullKey: string,
    headKey: string,
    countKey: string,
    id: string,
    limit: number,
    isGlobal: boolean,
  ): Promise<void> {
    const existing = (await messagesKV.get<string[]>(fullKey)) || [];
    const next = [id, ...existing.filter((item) => item !== id)];

    if (next.length > limit) {
      next.length = limit;
    }

    const operations: Array<Promise<void>> = [
      messagesKV.putMany<unknown>([
        { key: fullKey, value: next },
        { key: headKey, value: next.slice(0, MESSAGE_HEAD_INDEX_LIMIT) },
        { key: countKey, value: next.length },
      ]),
    ];

    if (isGlobal) {
      operations.push(messagesKV.put(KVKeys.MESSAGE_INDEX_META, {
        version: MESSAGE_INDEX_VERSION,
        rebuiltAt: new Date().toISOString(),
        total: next.length,
      }));
    }

    await Promise.all(operations);
  }

  private async removeIndexId(
    fullKey: string,
    headKey: string,
    countKey: string,
    id: string,
    isGlobal: boolean,
  ): Promise<void> {
    const existing = await messagesKV.get<string[]>(fullKey);
    if (!existing || existing.length === 0) {
      return;
    }

    const next = existing.filter((item) => item !== id);
    if (next.length === existing.length) {
      return;
    }

    if (next.length === 0) {
      await Promise.all([
        messagesKV.deleteMany([fullKey, headKey, countKey]),
        ...(isGlobal ? [messagesKV.put(KVKeys.MESSAGE_INDEX_META, {
          version: MESSAGE_INDEX_VERSION,
          rebuiltAt: new Date().toISOString(),
          total: 0,
        })] : []),
      ]);
      return;
    }

    const operations: Array<Promise<void>> = [
      messagesKV.putMany<unknown>([
        { key: fullKey, value: next },
        { key: headKey, value: next.slice(0, MESSAGE_HEAD_INDEX_LIMIT) },
        { key: countKey, value: next.length },
      ]),
    ];

    if (isGlobal) {
      operations.push(messagesKV.put(KVKeys.MESSAGE_INDEX_META, {
        version: MESSAGE_INDEX_VERSION,
        rebuiltAt: new Date().toISOString(),
        total: next.length,
      }));
    }

    await Promise.all(operations);
  }

  private async markIndexesNeedsRebuild(): Promise<void> {
    await messagesKV.delete(KVKeys.MESSAGE_INDEX_META);
  }

  private async getFilterApps(baseUrl: string): Promise<MessageWorkspaceResponse['filters']['apps']> {
    const summaries = await adminIndexService.listAppSummaries(baseUrl);
    return summaries.map((summary) => ({
      id: summary.id,
      name: summary.name,
    }));
  }

  private buildPreviewText(message: Message): string {
    const source = message.summary
      || message.content
      || message.desp
      || (message.type === 'event' && message.event ? `事件：${message.event}` : '');

    return source.replace(/\s+/g, ' ').trim() || message.title;
  }

  private async loadListItems(
    ids: string[],
    appNameById: Map<string, string>
  ): Promise<MessageListItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const summaryMap = await messagesKV.getMany<MessageSummaryRecord>(
      ids.map((id) => KVKeys.MESSAGE_SUMMARY(id))
    );

    const items: MessageListItem[] = [];
    const missingIds: string[] = [];

    for (const id of ids) {
      const summary = summaryMap[KVKeys.MESSAGE_SUMMARY(id)] ?? null;
      if (summary) {
        items.push(this.hydrateMessageListItem(summary, appNameById));
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length === 0) {
      return items;
    }

    const messageMap = await messagesKV.getMany<Message>(missingIds.map((id) => KVKeys.MESSAGE(id)));
    const recovered: Array<{ id: string; summary: MessageSummaryRecord }> = [];

    for (const id of missingIds) {
      const message = messageMap[KVKeys.MESSAGE(id)] ?? null;
      if (!message) {
        continue;
      }

      const summary = this.toMessageSummaryRecord(message);
      recovered.push({ id, summary });
      items.push(this.hydrateMessageListItem(summary, appNameById));
    }

    if (recovered.length > 0) {
      void batchProcess(
        recovered,
        ({ id, summary }) => messagesKV.put(KVKeys.MESSAGE_SUMMARY(id), summary),
        20
      );
    }

    return ids
      .map((id) => items.find((item) => item.id === id) ?? null)
      .filter((item): item is MessageListItem => item !== null);
  }

  private getDeliverySummary(message: Message): MessageDeliverySummary {
    if (message.direction === 'inbound') {
      return {
        total: 0,
        success: 0,
        failed: 0,
        state: 'received',
      };
    }

    const total = message.results?.length ?? 0;
    const success = message.results?.filter((item) => item.success).length ?? 0;
    const failed = Math.max(total - success, 0);

    if (total === 0) {
      return {
        total,
        success,
        failed,
        state: 'failed',
      };
    }

    if (failed === 0) {
      return {
        total,
        success,
        failed,
        state: 'success',
      };
    }

    if (success === 0) {
      return {
        total,
        success,
        failed,
        state: 'failed',
      };
    }

    return {
      total,
      success,
      failed,
      state: 'partial',
    };
  }

  private hydrateMessageListItem(
    item: MessageSummaryRecord,
    appNameById: Map<string, string>
  ): MessageListItem {
    if (!item.appId || item.appName) {
      return item;
    }

    return {
      ...item,
      appName: appNameById.get(item.appId),
    };
  }

  private toMessageSummaryRecord(message: Message): MessageSummaryRecord {
    return {
      id: message.id,
      direction: message.direction,
      type: message.type,
      channelId: message.channelId,
      appId: message.appId,
      appName: message.appName,
      openId: message.openId,
      title: message.title,
      previewText: this.buildPreviewText(message),
      contentFormat: message.contentFormat,
      originalUrl: message.originalUrl,
      detailPageUrl: message.detailPageUrl,
      jumpMode: message.jumpMode,
      event: message.event,
      createdAt: message.createdAt,
      delivery: this.getDeliverySummary(message),
    };
  }

  private toMessageListItem(message: Message, appNameById: Map<string, string>): MessageListItem {
    return {
      id: message.id,
      direction: message.direction,
      type: message.type,
      channelId: message.channelId,
      appId: message.appId,
      appName: message.appName || (message.appId ? appNameById.get(message.appId) : undefined),
      openId: message.openId,
      title: message.title,
      previewText: this.buildPreviewText(message),
      contentFormat: message.contentFormat,
      originalUrl: message.originalUrl,
      detailPageUrl: message.detailPageUrl,
      jumpMode: message.jumpMode,
      event: message.event,
      createdAt: message.createdAt,
      delivery: this.getDeliverySummary(message),
    };
  }

  private buildListStats(items: MessageListItem[], total: number): MessageListStats {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    return items.reduce<MessageListStats>((stats, item) => {
      if (new Date(item.createdAt).getTime() >= cutoff) {
        stats.recent24h += 1;
      }

      stats.success += item.delivery.success;
      stats.failed += item.delivery.failed;
      return stats;
    }, {
      total,
      recent24h: 0,
      success: 0,
      failed: 0,
    });
  }

  private async ensureIndexesReady(): Promise<void> {
    const keyMap = await messagesKV.getMany<MessageIndexMeta | string[] | number>([
      KVKeys.MESSAGE_INDEX_META,
      KVKeys.MESSAGE_LIST,
      KVKeys.MESSAGE_LIST_HEAD,
      KVKeys.MESSAGE_COUNT,
    ]);
    const meta = keyMap[KVKeys.MESSAGE_INDEX_META] as MessageIndexMeta | null | undefined;
    const globalIds = keyMap[KVKeys.MESSAGE_LIST] as string[] | null | undefined;
    const globalHead = keyMap[KVKeys.MESSAGE_LIST_HEAD] as string[] | null | undefined;
    const globalCount = keyMap[KVKeys.MESSAGE_COUNT] as number | null | undefined;
    if (meta?.version === MESSAGE_INDEX_VERSION && globalIds && globalHead && typeof globalCount === 'number') {
      return;
    }

    await this.rebuildIndexes();
  }

  private async rebuildIndexes(): Promise<void> {
    if (!this.rebuildIndexesPromise) {
      this.rebuildIndexesPromise = this.doRebuildIndexes().finally(() => {
        this.rebuildIndexesPromise = null;
      });
    }

    await this.rebuildIndexesPromise;
  }

  private async doRebuildIndexes(): Promise<void> {
    const messageKeys = await messagesKV.listAll(KVKeys.MESSAGE_PREFIX);
    const messageRecords = (
      await batchProcess(
        chunkItems(messageKeys, 50),
        (batch) => this.loadMessagesByKeys(batch),
        1
      )
    ).flat();
    const messages = messageRecords
      .filter((message): message is Message => message !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const indexes = this.buildIndexCollection(messages);
    const [
      existingAppKeys,
      existingAppHeadKeys,
      existingAppCountKeys,
      existingSummaryKeys,
      legacyChannelKeys,
      legacyChannelHeadKeys,
      legacyChannelCountKeys,
      legacyOpenIdKeys,
      legacyOpenIdHeadKeys,
      legacyOpenIdCountKeys,
    ] = await Promise.all([
      messagesKV.listAll(KVKeys.MESSAGE_APP_PREFIX),
      messagesKV.listAll(KVKeys.MESSAGE_APP_HEAD_PREFIX),
      messagesKV.listAll(KVKeys.MESSAGE_APP_COUNT_PREFIX),
      messagesKV.listAll(KVKeys.MESSAGE_SUMMARY_PREFIX),
      messagesKV.listAll(LegacyKVKeys.MESSAGE_CHANNEL_PREFIX),
      messagesKV.listAll(LegacyKVKeys.MESSAGE_CHANNEL_HEAD_PREFIX),
      messagesKV.listAll(LegacyKVKeys.MESSAGE_CHANNEL_COUNT_PREFIX),
      messagesKV.listAll(LegacyKVKeys.MESSAGE_OPENID_PREFIX),
      messagesKV.listAll(LegacyKVKeys.MESSAGE_OPENID_HEAD_PREFIX),
      messagesKV.listAll(LegacyKVKeys.MESSAGE_OPENID_COUNT_PREFIX),
    ]);

    const putOperations: Array<{ key: string; value: string[] | MessageIndexMeta | number }> = [
      { key: KVKeys.MESSAGE_LIST, value: indexes.global },
      { key: KVKeys.MESSAGE_LIST_HEAD, value: indexes.globalHead },
      { key: KVKeys.MESSAGE_COUNT, value: indexes.globalCount },
      {
        key: KVKeys.MESSAGE_INDEX_META,
        value: {
          version: MESSAGE_INDEX_VERSION,
          rebuiltAt: new Date().toISOString(),
          total: indexes.globalCount,
        },
      },
    ];
    const summaryOperations = messages.map((message) => ({
      key: KVKeys.MESSAGE_SUMMARY(message.id),
      value: this.toMessageSummaryRecord(message),
    }));

    for (const [key, value] of indexes.apps) {
      putOperations.push({ key, value });
    }
    for (const [key, value] of indexes.appHeads) {
      putOperations.push({ key, value });
    }
    for (const [key, value] of indexes.appCounts) {
      putOperations.push({ key, value });
    }
    await messagesKV.putMany<unknown>([...putOperations, ...summaryOperations]);

    const staleKeys = [
      ...existingAppKeys.filter((key) => !indexes.apps.has(key)),
      ...existingAppHeadKeys.filter((key) => !indexes.appHeads.has(key)),
      ...existingAppCountKeys.filter((key) => !indexes.appCounts.has(key)),
      ...existingSummaryKeys.filter((key) => !messageKeys.includes(key.replace(KVKeys.MESSAGE_SUMMARY_PREFIX, KVKeys.MESSAGE_PREFIX))),
    ];

    await messagesKV.deleteMany([
      ...staleKeys,
      ...legacyChannelKeys,
      ...legacyChannelHeadKeys,
      ...legacyChannelCountKeys,
      ...legacyOpenIdKeys,
      ...legacyOpenIdHeadKeys,
      ...legacyOpenIdCountKeys,
    ]);
  }

  private buildIndexCollection(messages: Message[]): MessageIndexCollection {
    const indexes: MessageIndexCollection = {
      global: [],
      globalHead: [],
      globalCount: messages.length,
      apps: new Map<string, string[]>(),
      appHeads: new Map<string, string[]>(),
      appCounts: new Map<string, number>(),
    };

    for (const message of messages) {
      if (indexes.global.length < GLOBAL_INDEX_LIMIT) {
        indexes.global.push(message.id);
      }
      if (indexes.globalHead.length < MESSAGE_HEAD_INDEX_LIMIT) {
        indexes.globalHead.push(message.id);
      }

      if (message.appId) {
        this.pushIndexId(
          indexes.apps,
          indexes.appHeads,
          indexes.appCounts,
          KVKeys.MESSAGE_APP(message.appId),
          KVKeys.MESSAGE_APP_HEAD(message.appId),
          KVKeys.MESSAGE_APP_COUNT(message.appId),
          message.id,
          APP_INDEX_LIMIT
        );
      }
    }

    return indexes;
  }

  private pushIndexId(
    collection: Map<string, string[]>,
    headCollection: Map<string, string[]>,
    countCollection: Map<string, number>,
    key: string,
    headKey: string,
    countKey: string,
    id: string,
    limit: number
  ): void {
    const list = collection.get(key);
    if (list) {
      countCollection.set(countKey, (countCollection.get(countKey) ?? 0) + 1);
      const headList = headCollection.get(headKey) ?? [];
      if (headList.length < MESSAGE_HEAD_INDEX_LIMIT) {
        headList.push(id);
        headCollection.set(headKey, headList);
      }
      if (list.length < limit) {
        list.push(id);
      }
      return;
    }

    collection.set(key, [id]);
    headCollection.set(headKey, [id]);
    countCollection.set(countKey, 1);
  }
}

export const messageService = new MessageService();
