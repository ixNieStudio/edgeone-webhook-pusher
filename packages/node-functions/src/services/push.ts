import type { MessageData, DeliveryResult, PushRequest, ChannelData } from '@webhook-pusher/shared';
import { generateId, now, getChannelAdapter } from '@webhook-pusher/shared';
import { messagesKV } from './kv-client.js';
import { channelService } from './channel.js';

export interface PushResult {
  pushId: string;
  deliveryResults: DeliveryResult[];
}

export class PushService {
  /**
   * Send push notification to all enabled channels
   */
  async push(userId: string, request: PushRequest): Promise<PushResult> {
    const pushId = generateId();
    const timestamp = now();

    // Get enabled channels (or specific channel if specified)
    let channels: ChannelData[];
    if (request.channel) {
      const channel = await channelService.getChannel(userId, request.channel);
      channels = channel && channel.enabled ? [channel] : [];
    } else {
      channels = await channelService.getEnabledChannels(userId);
    }

    // Create message record
    const message: MessageData = {
      id: pushId,
      userId,
      title: request.title,
      content: request.desp,
      createdAt: timestamp,
      deliveryResults: [],
    };

    // Dispatch to all channels concurrently
    const deliveryPromises = channels.map(async (channel): Promise<DeliveryResult> => {
      const adapter = getChannelAdapter(channel.type);
      if (!adapter) {
        return {
          channelId: channel.id,
          channelType: channel.type,
          status: 'failed',
          error: `Unsupported channel type: ${channel.type}`,
        };
      }

      try {
        const result = await adapter.send(
          {
            id: pushId,
            title: request.title,
            content: request.desp,
            createdAt: timestamp,
          },
          channel.credentials
        );

        return {
          channelId: channel.id,
          channelType: channel.type,
          status: result.success ? 'success' : 'failed',
          error: result.error,
          externalId: result.externalId,
        };
      } catch (error) {
        return {
          channelId: channel.id,
          channelType: channel.type,
          status: 'failed',
          error: String(error),
        };
      }
    });

    const deliveryResults = await Promise.all(deliveryPromises);
    message.deliveryResults = deliveryResults;

    // Save message to KV
    await messagesKV.put(pushId, message);

    return { pushId, deliveryResults };
  }
}

export const pushService = new PushService();
