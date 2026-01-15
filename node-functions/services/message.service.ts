/**
 * Message Service - 消息历史记录管理
 * 
 * 支持按 App 筛选消息历史
 */

import { messagesKV } from '../shared/kv-client.js';
import type { Message } from '../types/index.js';
import { KVKeys } from '../types/index.js';

interface ListOptions {
  page?: number;
  pageSize?: number;
  appId?: string;
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
  success: number;
  failed: number;
}

class MessageService {
  /**
   * 保存消息记录
   */
  async saveMessage(message: Message): Promise<void> {
    // 保存消息记录
    await messagesKV.put(KVKeys.MESSAGE(message.id), message);

    // 更新全局消息列表
    const globalList = (await messagesKV.get<string[]>(KVKeys.MESSAGE_LIST)) || [];
    globalList.unshift(message.id); // 新消息放在前面
    await messagesKV.put(KVKeys.MESSAGE_LIST, globalList);

    // 更新应用消息列表
    if (message.appId) {
      const appList = (await messagesKV.get<string[]>(KVKeys.MESSAGE_APP(message.appId))) || [];
      appList.unshift(message.id);
      await messagesKV.put(KVKeys.MESSAGE_APP(message.appId), appList);
    }
  }

  /**
   * 获取消息详情
   */
  async get(id: string): Promise<Message | null> {
    return messagesKV.get<Message>(KVKeys.MESSAGE(id));
  }

  /**
   * 分页查询消息历史
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    const { page = 1, pageSize = 20, appId, startDate, endDate } = options;

    // 根据是否有 appId 筛选，选择不同的列表
    let ids: string[];
    if (appId) {
      ids = (await messagesKV.get<string[]>(KVKeys.MESSAGE_APP(appId))) || [];
    } else {
      ids = (await messagesKV.get<string[]>(KVKeys.MESSAGE_LIST)) || [];
    }

    // 获取所有消息数据
    const allMessages: Message[] = [];
    for (const id of ids) {
      const data = await messagesKV.get<Message>(KVKeys.MESSAGE(id));
      if (data) {
        allMessages.push(data);
      }
    }

    // 筛选
    let filtered = allMessages;

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
   * 删除消息记录
   */
  async delete(id: string): Promise<boolean> {
    const data = await this.get(id);
    if (!data) return false;

    await messagesKV.delete(KVKeys.MESSAGE(id));
    return true;
  }

  /**
   * 清理过期记录
   */
  async cleanup(retentionDays = 30): Promise<number> {
    const keys = await messagesKV.listAll(KVKeys.MESSAGE_PREFIX);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const key of keys) {
      const data = await messagesKV.get<Message>(key);
      if (data && new Date(data.createdAt) < cutoff) {
        await messagesKV.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取统计数据
   */
  async getStats(): Promise<Stats> {
    const keys = await messagesKV.listAll(KVKeys.MESSAGE_PREFIX);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = 0;
    let todayCount = 0;
    let success = 0;
    let failed = 0;

    for (const key of keys) {
      const data = await messagesKV.get<Message>(key);
      if (data) {
        total++;

        if (new Date(data.createdAt) >= today) {
          todayCount++;
        }

        // 统计成功/失败
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

    return { total, today: todayCount, success, failed };
  }
}

export const messageService = new MessageService();
