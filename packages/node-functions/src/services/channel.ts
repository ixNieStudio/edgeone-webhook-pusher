import type { ChannelData, ChannelType } from '@webhook-pusher/shared';
import {
  generateId,
  now,
  maskCredentials,
  getChannelAdapter,
  getSensitiveFields,
} from '@webhook-pusher/shared';
import { channelsKV } from './kv-client.js';

export class ChannelService {
  /**
   * Get all channels for a user
   */
  async getChannels(userId: string): Promise<ChannelData[]> {
    const keys = await channelsKV.list(`${userId}_`);
    const channels: ChannelData[] = [];

    for (const key of keys) {
      const channel = await channelsKV.get<ChannelData>(key);
      if (channel) {
        channels.push(channel);
      }
    }

    return channels;
  }

  /**
   * Get enabled channels for a user
   */
  async getEnabledChannels(userId: string): Promise<ChannelData[]> {
    const channels = await this.getChannels(userId);
    return channels.filter((c) => c.enabled);
  }

  /**
   * Get channel by ID
   */
  async getChannel(userId: string, channelId: string): Promise<ChannelData | null> {
    return channelsKV.get<ChannelData>(`${userId}_${channelId}`);
  }

  /**
   * Create a new channel
   */
  async createChannel(
    userId: string,
    type: ChannelType,
    name: string,
    credentials: Record<string, string>
  ): Promise<ChannelData> {
    // Validate credentials
    const adapter = getChannelAdapter(type);
    if (!adapter) {
      throw new Error(`Unsupported channel type: ${type}`);
    }

    const isValid = await adapter.validate(credentials);
    if (!isValid) {
      throw new Error('Invalid channel credentials');
    }

    const id = generateId();
    const timestamp = now();

    const channel: ChannelData = {
      id,
      userId,
      type,
      name,
      enabled: true,
      credentials,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await channelsKV.put(`${userId}_${id}`, channel);
    return channel;
  }

  /**
   * Update channel
   */
  async updateChannel(
    userId: string,
    channelId: string,
    updates: Partial<Pick<ChannelData, 'name' | 'enabled' | 'credentials'>>
  ): Promise<ChannelData | null> {
    const channel = await this.getChannel(userId, channelId);
    if (!channel) return null;

    // If credentials are being updated, validate them
    if (updates.credentials) {
      const adapter = getChannelAdapter(channel.type);
      if (adapter) {
        const isValid = await adapter.validate(updates.credentials);
        if (!isValid) {
          throw new Error('Invalid channel credentials');
        }
      }
    }

    const updated: ChannelData = {
      ...channel,
      ...updates,
      updatedAt: now(),
    };

    await channelsKV.put(`${userId}_${channelId}`, updated);
    return updated;
  }

  /**
   * Delete channel
   */
  async deleteChannel(userId: string, channelId: string): Promise<boolean> {
    const channel = await this.getChannel(userId, channelId);
    if (!channel) return false;

    await channelsKV.delete(`${userId}_${channelId}`);
    return true;
  }

  /**
   * Mask sensitive credentials in channel data
   */
  maskChannelCredentials(channel: ChannelData): ChannelData {
    const sensitiveFields = getSensitiveFields(channel.type);
    return {
      ...channel,
      credentials: maskCredentials(channel.credentials, sensitiveFields),
    };
  }
}

export const channelService = new ChannelService();
