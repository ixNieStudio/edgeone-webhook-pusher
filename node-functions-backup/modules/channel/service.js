/**
 * Channel Service - 渠道管理
 * 管理消息发送渠道（如微信公众号）
 */

import { channelsKV, appsKV } from '../../shared/kv-client.js';
import { generateChannelId, now, maskCredential } from '../../shared/utils.js';
import { KVKeys, ChannelTypes } from '../../shared/types.js';

class ChannelService {
  /**
   * 创建渠道
   * @param {Object} data - 渠道数据
   * @param {string} data.name - 渠道名称
   * @param {'wechat'} data.type - 渠道类型
   * @param {Object} data.config - 渠道配置
   * @param {string} data.config.appId - 微信 AppID
   * @param {string} data.config.appSecret - 微信 AppSecret
   * @returns {Promise<import('../../shared/types.js').Channel>}
   */
  async create(data) {
    const { name, type = ChannelTypes.WECHAT, config } = data;

    // 验证必填字段
    if (!name || !name.trim()) {
      throw new Error('Channel name is required');
    }
    if (!config?.appId) {
      throw new Error('appId is required');
    }
    if (!config?.appSecret) {
      throw new Error('appSecret is required');
    }

    const id = generateChannelId();
    const timestamp = now();

    const channel = {
      id,
      name: name.trim(),
      type,
      config: {
        appId: config.appId,
        appSecret: config.appSecret,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 保存渠道
    await channelsKV.put(KVKeys.CHANNEL(id), channel);

    // 更新渠道列表
    const list = (await channelsKV.get(KVKeys.CHANNEL_LIST)) || [];
    list.push(id);
    await channelsKV.put(KVKeys.CHANNEL_LIST, list);

    return channel;
  }

  /**
   * 根据 ID 获取渠道
   * @param {string} id - 渠道 ID
   * @returns {Promise<import('../../shared/types.js').Channel | null>}
   */
  async getById(id) {
    return channelsKV.get(KVKeys.CHANNEL(id));
  }

  /**
   * 获取所有渠道列表
   * @returns {Promise<import('../../shared/types.js').Channel[]>}
   */
  async list() {
    const ids = (await channelsKV.get(KVKeys.CHANNEL_LIST)) || [];
    const channels = [];

    for (const id of ids) {
      const channel = await channelsKV.get(KVKeys.CHANNEL(id));
      if (channel) {
        channels.push(channel);
      }
    }

    return channels;
  }

  /**
   * 更新渠道
   * @param {string} id - 渠道 ID
   * @param {Object} data - 更新数据
   * @returns {Promise<import('../../shared/types.js').Channel>}
   */
  async update(id, data) {
    const channel = await this.getById(id);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const { name, config } = data;

    if (name !== undefined) {
      if (!name.trim()) {
        throw new Error('Channel name cannot be empty');
      }
      channel.name = name.trim();
    }

    if (config) {
      if (config.appId !== undefined) {
        channel.config.appId = config.appId;
      }
      if (config.appSecret !== undefined) {
        channel.config.appSecret = config.appSecret;
      }
    }

    channel.updatedAt = now();

    await channelsKV.put(KVKeys.CHANNEL(id), channel);
    return channel;
  }

  /**
   * 删除渠道
   * @param {string} id - 渠道 ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    const channel = await this.getById(id);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // 检查是否被应用引用
    const isReferenced = await this.isReferenced(id);
    if (isReferenced) {
      throw new Error('Channel is referenced by apps and cannot be deleted');
    }

    // 删除渠道
    await channelsKV.delete(KVKeys.CHANNEL(id));

    // 更新渠道列表
    const list = (await channelsKV.get(KVKeys.CHANNEL_LIST)) || [];
    const newList = list.filter((cid) => cid !== id);
    await channelsKV.put(KVKeys.CHANNEL_LIST, newList);
  }

  /**
   * 检查渠道是否被应用引用
   * @param {string} id - 渠道 ID
   * @returns {Promise<boolean>}
   */
  async isReferenced(id) {
    const appIds = (await appsKV.get(KVKeys.APP_LIST)) || [];

    for (const appId of appIds) {
      const app = await appsKV.get(KVKeys.APP(appId));
      if (app && app.channelId === id) {
        return true;
      }
    }

    return false;
  }

  /**
   * 脱敏渠道配置
   * @param {import('../../shared/types.js').Channel} channel
   * @returns {Object}
   */
  maskChannel(channel) {
    return {
      ...channel,
      config: {
        appId: channel.config.appId,
        appSecret: maskCredential(channel.config.appSecret),
      },
    };
  }
}

export const channelService = new ChannelService();
