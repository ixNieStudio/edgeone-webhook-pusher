/**
 * Message Service - 消息历史记录管理
 * 
 * 支持按渠道、应用、用户、方向筛选消息历史
 */

import { messagesKV } from '../shared/kv-client.js';
import type { Message, MessageDirection } from '../types/index.js';
import { KVKeys } from '../types/index.js';

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
  channels: Map<string, string[]>;
  apps: Map<string, string[]>;
  openIds: Map<string, string[]>;
}

const GLOBAL_INDEX_LIMIT = 10000;
const CHANNEL_INDEX_LIMIT = 5000;
const APP_INDEX_LIMIT = 5000;
const OPENID_INDEX_LIMIT = 1000;
const MESSAGE_INDEX_VERSION = 1;

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

class MessageService {
  private rebuildIndexesPromise: Promise<void> | null = null;

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
    await messagesKV.put(KVKeys.MESSAGE(message.id), message);

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

  /**
   * 分页查询消息历史（优化版 - 只查询当前页数据）
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    const { page = 1, pageSize = 20, channelId, appId, openId, direction, startDate, endDate } = options;
    await this.ensureIndexesReady();

    // 根据筛选条件选择最优的索引列表
    const ids = await this.getIndexedIds({ channelId, appId, openId });

    // 如果没有其他筛选条件，直接分页返回（最优情况）
    if (!direction && !startDate && !endDate && (!channelId || openId || appId) && (!appId || openId)) {
      const total = ids.length;
      const startIdx = (page - 1) * pageSize;
      const pageIds = ids.slice(startIdx, startIdx + pageSize);
      
      // 只查询当前页的消息
      const messages: Message[] = [];
      const messagePromises = pageIds.map(id => messagesKV.get<Message>(KVKeys.MESSAGE(id)));
      const messageResults = await Promise.all(messagePromises);
      
      for (const data of messageResults) {
        if (data) {
          messages.push(data);
        }
      }
      
      return { messages, total, page, pageSize };
    }

    // 有额外筛选条件时，需要查询所有消息进行筛选
    // 但我们可以分批查询以提高性能
    const batchSize = 100;
    const allMessages: Message[] = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batchPromises = batchIds.map(id => messagesKV.get<Message>(KVKeys.MESSAGE(id)));
      const batchResults = await Promise.all(batchPromises);
      
      for (const data of batchResults) {
        if (data) {
          allMessages.push(data);
        }
      }
      
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

    await messagesKV.delete(KVKeys.MESSAGE(id));
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
    const messages = await batchProcess(
      keys,
      key => messagesKV.get<Message>(key),
      50
    );

    // 找出需要删除的消息
    const toDelete: string[] = [];
    const expiredMessages: Message[] = [];
    messages.forEach((data, index) => {
      if (data && new Date(data.createdAt) < cutoff) {
        toDelete.push(keys[index]);
        expiredMessages.push(data);
      }
    });

    // 批量删除过期消息（每批 50 个）
    await batchProcess(
      toDelete,
      key => messagesKV.delete(key),
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 使用分页，每次最多获取 20 条
    const result = await messagesKV.list(KVKeys.MESSAGE_PREFIX, 20);
    const keys = result.keys;

    // 批量获取消息（每批 50 个），避免并发过多
    const messages = await batchProcess(
      keys,
      key => messagesKV.get<Message>(key),
      50
    );

    let total = 0;
    let todayCount = 0;
    let inbound = 0;
    let outbound = 0;
    let success = 0;
    let failed = 0;

    for (const data of messages) {
      if (data) {
        total++;

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

  private async getIndexedIds(filters: Pick<ListOptions, 'channelId' | 'appId' | 'openId'>): Promise<string[]> {
    const { channelId, appId, openId } = filters;

    if (openId) {
      return (await messagesKV.get<string[]>(KVKeys.MESSAGE_OPENID(openId))) || [];
    }
    if (appId) {
      return (await messagesKV.get<string[]>(KVKeys.MESSAGE_APP(appId))) || [];
    }
    if (channelId) {
      return (await messagesKV.get<string[]>(KVKeys.MESSAGE_CHANNEL(channelId))) || [];
    }
    return (await messagesKV.get<string[]>(KVKeys.MESSAGE_LIST)) || [];
  }

  private async addMessageToIndexes(message: Message): Promise<void> {
    await Promise.all(
      this.getIndexDescriptors(message).map(({ key, limit }) =>
        this.prependIndexId(key, message.id, limit)
      )
    );
  }

  private async removeMessageFromIndexes(message: Message): Promise<void> {
    await Promise.all(
      this.getIndexDescriptors(message).map(({ key }) =>
        this.removeIndexId(key, message.id)
      )
    );
  }

  private getIndexDescriptors(message: Message): Array<{ key: string; limit: number }> {
    const descriptors = [
      { key: KVKeys.MESSAGE_LIST, limit: GLOBAL_INDEX_LIMIT },
      { key: KVKeys.MESSAGE_CHANNEL(message.channelId), limit: CHANNEL_INDEX_LIMIT },
    ];

    if (message.appId) {
      descriptors.push({ key: KVKeys.MESSAGE_APP(message.appId), limit: APP_INDEX_LIMIT });
    }

    if (message.openId) {
      descriptors.push({ key: KVKeys.MESSAGE_OPENID(message.openId), limit: OPENID_INDEX_LIMIT });
    }

    return descriptors;
  }

  private async prependIndexId(key: string, id: string, limit: number): Promise<void> {
    const existing = (await messagesKV.get<string[]>(key)) || [];
    const next = [id, ...existing.filter((item) => item !== id)];

    if (next.length > limit) {
      next.length = limit;
    }

    await messagesKV.put(key, next);
  }

  private async removeIndexId(key: string, id: string): Promise<void> {
    const existing = await messagesKV.get<string[]>(key);
    if (!existing || existing.length === 0) {
      return;
    }

    const next = existing.filter((item) => item !== id);
    if (next.length === existing.length) {
      return;
    }

    if (next.length === 0) {
      await messagesKV.delete(key);
      return;
    }

    await messagesKV.put(key, next);
  }

  private async markIndexesNeedsRebuild(): Promise<void> {
    await messagesKV.delete(KVKeys.MESSAGE_INDEX_META);
  }

  private async ensureIndexesReady(): Promise<void> {
    const meta = await messagesKV.get<MessageIndexMeta>(KVKeys.MESSAGE_INDEX_META);
    if (meta?.version === MESSAGE_INDEX_VERSION) {
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
    const messageRecords = await batchProcess(
      messageKeys,
      key => messagesKV.get<Message>(key),
      50
    );
    const messages = messageRecords
      .filter((message): message is Message => message !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const indexes = this.buildIndexCollection(messages);
    const [existingChannelKeys, existingAppKeys, existingOpenIdKeys] = await Promise.all([
      messagesKV.listAll(KVKeys.MESSAGE_CHANNEL_PREFIX),
      messagesKV.listAll(KVKeys.MESSAGE_APP_PREFIX),
      messagesKV.listAll(KVKeys.MESSAGE_OPENID_PREFIX),
    ]);

    const putOperations: Array<{ key: string; value: string[] | MessageIndexMeta }> = [
      { key: KVKeys.MESSAGE_LIST, value: indexes.global },
      {
        key: KVKeys.MESSAGE_INDEX_META,
        value: {
          version: MESSAGE_INDEX_VERSION,
          rebuiltAt: new Date().toISOString(),
          total: messages.length,
        },
      },
    ];

    for (const [key, value] of indexes.channels) {
      putOperations.push({ key, value });
    }
    for (const [key, value] of indexes.apps) {
      putOperations.push({ key, value });
    }
    for (const [key, value] of indexes.openIds) {
      putOperations.push({ key, value });
    }

    await batchProcess(
      putOperations,
      ({ key, value }) => messagesKV.put(key, value),
      20
    );

    const staleKeys = [
      ...existingChannelKeys.filter((key) => !indexes.channels.has(key)),
      ...existingAppKeys.filter((key) => !indexes.apps.has(key)),
      ...existingOpenIdKeys.filter((key) => !indexes.openIds.has(key)),
    ];

    await batchProcess(
      staleKeys,
      key => messagesKV.delete(key),
      20
    );
  }

  private buildIndexCollection(messages: Message[]): MessageIndexCollection {
    const indexes: MessageIndexCollection = {
      global: [],
      channels: new Map<string, string[]>(),
      apps: new Map<string, string[]>(),
      openIds: new Map<string, string[]>(),
    };

    for (const message of messages) {
      if (indexes.global.length < GLOBAL_INDEX_LIMIT) {
        indexes.global.push(message.id);
      }

      this.pushIndexId(indexes.channels, KVKeys.MESSAGE_CHANNEL(message.channelId), message.id, CHANNEL_INDEX_LIMIT);

      if (message.appId) {
        this.pushIndexId(indexes.apps, KVKeys.MESSAGE_APP(message.appId), message.id, APP_INDEX_LIMIT);
      }

      if (message.openId) {
        this.pushIndexId(indexes.openIds, KVKeys.MESSAGE_OPENID(message.openId), message.id, OPENID_INDEX_LIMIT);
      }
    }

    return indexes;
  }

  private pushIndexId(
    collection: Map<string, string[]>,
    key: string,
    id: string,
    limit: number
  ): void {
    const list = collection.get(key);
    if (list) {
      if (list.length < limit) {
        list.push(id);
      }
      return;
    }

    collection.set(key, [id]);
  }
}

export const messageService = new MessageService();
