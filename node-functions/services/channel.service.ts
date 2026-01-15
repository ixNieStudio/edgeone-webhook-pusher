/**
 * Channel Service - 渠道管理
 * 管理消息发送渠道（如微信公众号）
 */

import { channelsKV, appsKV } from '../shared/kv-client.js';
import { generateChannelId, now, maskCredential } from '../shared/utils.js';
import type { Channel, CreateChannelInput, UpdateChannelInput, App } from '../types/index.js';
import { KVKeys, ChannelTypes, ApiError, ErrorCodes } from '../types/index.js';

class ChannelService {
  /**
   * 创建渠道
   */
  async create(data: CreateChannelInput): Promise<Channel> {
    const { name, type = ChannelTypes.WECHAT, config } = data;

    // 验证必填字段
    if (!name || !name.trim()) {
      throw ApiError.badRequest('Channel name is required');
    }
    if (!config?.appId) {
      throw ApiError.badRequest('appId is required');
    }
    if (!config?.appSecret) {
      throw ApiError.badRequest('appSecret is required');
    }

    const id = generateChannelId();
    const timestamp = now();

    const channel: Channel = {
      id,
      name: name.trim(),
      type: type as Channel['type'],
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
    const list = (await channelsKV.get<string[]>(KVKeys.CHANNEL_LIST)) || [];
    list.push(id);
    await channelsKV.put(KVKeys.CHANNEL_LIST, list);

    return channel;
  }

  /**
   * 根据 ID 获取渠道
   */
  async getById(id: string): Promise<Channel | null> {
    return channelsKV.get<Channel>(KVKeys.CHANNEL(id));
  }

  /**
   * 获取所有渠道列表
   */
  async list(): Promise<Channel[]> {
    const ids = (await channelsKV.get<string[]>(KVKeys.CHANNEL_LIST)) || [];
    const channels: Channel[] = [];

    for (const id of ids) {
      const channel = await channelsKV.get<Channel>(KVKeys.CHANNEL(id));
      if (channel) {
        channels.push(channel);
      }
    }

    return channels;
  }

  /**
   * 更新渠道
   */
  async update(id: string, data: UpdateChannelInput): Promise<Channel> {
    const channel = await this.getById(id);
    if (!channel) {
      throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
    }

    const { name, config } = data;

    if (name !== undefined) {
      if (!name.trim()) {
        throw ApiError.badRequest('Channel name cannot be empty');
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
   */
  async delete(id: string): Promise<void> {
    const channel = await this.getById(id);
    if (!channel) {
      throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
    }

    // 检查是否被应用引用
    const isReferenced = await this.isReferenced(id);
    if (isReferenced) {
      throw ApiError.conflict('Channel is referenced by apps and cannot be deleted');
    }

    // 删除渠道
    await channelsKV.delete(KVKeys.CHANNEL(id));

    // 更新渠道列表
    const list = (await channelsKV.get<string[]>(KVKeys.CHANNEL_LIST)) || [];
    const newList = list.filter((cid) => cid !== id);
    await channelsKV.put(KVKeys.CHANNEL_LIST, newList);
  }

  /**
   * 检查渠道是否被应用引用
   */
  async isReferenced(id: string): Promise<boolean> {
    const appIds = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];

    for (const appId of appIds) {
      const app = await appsKV.get<App>(KVKeys.APP(appId));
      if (app && app.channelId === id) {
        return true;
      }
    }

    return false;
  }

  /**
   * 脱敏渠道配置
   */
  maskChannel(channel: Channel): Channel {
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
