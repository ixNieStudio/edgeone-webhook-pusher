/**
 * History Service - 消息历史记录管理
 * Module: history
 * 
 * 支持按 App 筛选消息历史
 */

import { messagesKV } from '../../shared/kv-client.js';
import { KVKeys } from '../../shared/types.js';

class HistoryService {
  /**
   * 保存消息记录（新版，支持 appId）
   * @param {Object} message - 消息数据
   * @param {string} message.id - 消息 ID
   * @param {string} message.appId - 应用 ID
   * @param {string} message.title - 消息标题
   * @param {string} [message.desp] - 消息内容
   * @param {Array} message.results - 发送结果
   * @param {string} message.createdAt - 创建时间
   * @returns {Promise<void>}
   */
  async saveMessage(message) {
    // 保存消息记录
    await messagesKV.put(KVKeys.MESSAGE(message.id), message);

    // 更新全局消息列表
    const globalList = (await messagesKV.get(KVKeys.MESSAGE_LIST)) || [];
    globalList.unshift(message.id); // 新消息放在前面
    await messagesKV.put(KVKeys.MESSAGE_LIST, globalList);

    // 更新应用消息列表
    if (message.appId) {
      const appList = (await messagesKV.get(KVKeys.MESSAGE_APP(message.appId))) || [];
      appList.unshift(message.id);
      await messagesKV.put(KVKeys.MESSAGE_APP(message.appId), appList);
    }
  }

  /**
   * 保存消息记录（兼容旧版）
   * @param {Object} message - 消息数据
   * @returns {Promise<void>}
   */
  async save(message) {
    await messagesKV.put(KVKeys.MESSAGE(message.id), message);
  }

  /**
   * 获取消息详情
   * @param {string} id - 消息 ID
   * @returns {Promise<Object | null>}
   */
  async get(id) {
    return messagesKV.get(KVKeys.MESSAGE(id));
  }

  /**
   * 分页查询消息历史
   * @param {Object} options - 查询选项
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.pageSize=20] - 每页数量
   * @param {string} [options.appId] - 按应用筛选
   * @param {string} [options.startDate] - 开始时间
   * @param {string} [options.endDate] - 结束时间
   * @returns {Promise<{ messages: Object[], total: number, page: number, pageSize: number }>}
   */
  async list(options = {}) {
    const { page = 1, pageSize = 20, appId, startDate, endDate } = options;

    // 根据是否有 appId 筛选，选择不同的列表
    let ids;
    if (appId) {
      ids = (await messagesKV.get(KVKeys.MESSAGE_APP(appId))) || [];
    } else {
      ids = (await messagesKV.get(KVKeys.MESSAGE_LIST)) || [];
    }
    
    // 获取所有消息数据
    const allMessages = [];
    for (const id of ids) {
      const data = await messagesKV.get(KVKeys.MESSAGE(id));
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

    // 按时间倒序排序（列表已经是倒序，但为了安全起见再排一次）
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 分页
    const total = filtered.length;
    const startIdx = (page - 1) * pageSize;
    const messages = filtered.slice(startIdx, startIdx + pageSize);

    return { messages, total, page, pageSize };
  }

  /**
   * 按应用获取消息列表
   * @param {string} appId - 应用 ID
   * @param {Object} options - 查询选项
   * @returns {Promise<{ messages: Object[], total: number, page: number, pageSize: number }>}
   */
  async listByApp(appId, options = {}) {
    return this.list({ ...options, appId });
  }

  /**
   * 删除消息记录
   * @param {string} id - 消息 ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const data = await this.get(id);
    if (!data) return false;

    await messagesKV.delete(KVKeys.MESSAGE(id));
    return true;
  }

  /**
   * 清理过期记录
   * @param {number} retentionDays - 保留天数
   * @returns {Promise<number>} - 清理的记录数
   */
  async cleanup(retentionDays = 30) {
    const keys = await messagesKV.listAll('msg:');
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const key of keys) {
      const data = await messagesKV.get(key);
      if (data && new Date(data.createdAt) < cutoff) {
        await messagesKV.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取统计数据
   * @returns {Promise<{ total: number, today: number, success: number, failed: number }>}
   */
  async getStats() {
    const keys = await messagesKV.listAll('msg:');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = 0;
    let todayCount = 0;
    let success = 0;
    let failed = 0;

    for (const key of keys) {
      const data = await messagesKV.get(key);
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

export const historyService = new HistoryService();
