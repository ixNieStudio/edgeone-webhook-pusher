/**
 * Channel Service Tests
 * 测试渠道管理服务，包括新增的企业微信和 Webhook 渠道类型支持
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Channel, CreateChannelInput, UpdateChannelInput } from '../types/index.js';

// Mock KV client
vi.mock('../shared/kv-client.js', () => ({
  channelsKV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  appsKV: {
    get: vi.fn(),
  },
}));

// Mock utils
vi.mock('../shared/utils.js', () => ({
  generateChannelId: vi.fn(() => 'ch_test123'),
  now: vi.fn(() => '2024-01-01T00:00:00.000Z'),
  maskCredential: vi.fn((str: string) => str.substring(0, 4) + '****'),
}));

import { channelService } from './channel.service.js';
import { channelsKV, appsKV } from '../shared/kv-client.js';

const mockChannelsKV = vi.mocked(channelsKV);
const mockAppsKV = vi.mocked(appsKV);

describe('ChannelService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a WeChat channel with valid config', async () => {
      const input: CreateChannelInput = {
        name: 'Test WeChat Channel',
        type: 'wechat',
        config: {
          appId: 'wx123456',
          appSecret: 'secret123',
        },
      };

      mockChannelsKV.get.mockResolvedValue([]);
      mockChannelsKV.put.mockResolvedValue(undefined);

      const result = await channelService.create(input);

      expect(result).toMatchObject({
        id: 'ch_test123',
        name: 'Test WeChat Channel',
        type: 'wechat',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result.config).toHaveProperty('appId', 'wx123456');
      expect(result.config).toHaveProperty('appSecret', 'secret123');
      expect(result.config).toHaveProperty('msgToken');
    });

    it('should create a WorkWeChat channel with valid config', async () => {
      const input: CreateChannelInput = {
        name: 'Test WorkWeChat Channel',
        type: 'work_wechat',
        config: {
          corpId: 'corp123',
          agentId: 1000001,
          corpSecret: 'corpsecret123',
        },
      };

      mockChannelsKV.get.mockResolvedValue([]);
      mockChannelsKV.put.mockResolvedValue(undefined);

      const result = await channelService.create(input);

      expect(result).toMatchObject({
        id: 'ch_test123',
        name: 'Test WorkWeChat Channel',
        type: 'work_wechat',
        config: {
          corpId: 'corp123',
          agentId: 1000001,
          corpSecret: 'corpsecret123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should create a DingTalk webhook channel with valid config', async () => {
      const input: CreateChannelInput = {
        name: 'Test DingTalk Channel',
        type: 'dingtalk',
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
          secret: 'SEC123',
        },
      };

      mockChannelsKV.get.mockResolvedValue([]);
      mockChannelsKV.put.mockResolvedValue(undefined);

      const result = await channelService.create(input);

      expect(result).toMatchObject({
        id: 'ch_test123',
        name: 'Test DingTalk Channel',
        type: 'dingtalk',
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
          secret: 'SEC123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should create a Feishu webhook channel with valid config', async () => {
      const input: CreateChannelInput = {
        name: 'Test Feishu Channel',
        type: 'feishu',
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
        },
      };

      mockChannelsKV.get.mockResolvedValue([]);
      mockChannelsKV.put.mockResolvedValue(undefined);

      const result = await channelService.create(input);

      expect(result).toMatchObject({
        id: 'ch_test123',
        name: 'Test Feishu Channel',
        type: 'feishu',
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should throw error when WeChat channel missing appId', async () => {
      const input: CreateChannelInput = {
        name: 'Test WeChat Channel',
        type: 'wechat',
        config: {
          appSecret: 'secret123',
        } as any,
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'appId is required for WeChat channel'
      );
    });

    it('should throw error when WeChat channel missing appSecret', async () => {
      const input: CreateChannelInput = {
        name: 'Test WeChat Channel',
        type: 'wechat',
        config: {
          appId: 'wx123456',
        } as any,
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'appSecret is required for WeChat channel'
      );
    });

    it('should throw error when WorkWeChat channel missing corpId', async () => {
      const input: CreateChannelInput = {
        name: 'Test WorkWeChat Channel',
        type: 'work_wechat',
        config: {
          agentId: 1000001,
          corpSecret: 'secret123',
        } as any,
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'corpId is required for WorkWeChat channel'
      );
    });

    it('should throw error when WorkWeChat channel missing agentId', async () => {
      const input: CreateChannelInput = {
        name: 'Test WorkWeChat Channel',
        type: 'work_wechat',
        config: {
          corpId: 'corp123',
          corpSecret: 'secret123',
        } as any,
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'agentId is required for WorkWeChat channel'
      );
    });

    it('should throw error when WorkWeChat channel missing corpSecret', async () => {
      const input: CreateChannelInput = {
        name: 'Test WorkWeChat Channel',
        type: 'work_wechat',
        config: {
          corpId: 'corp123',
          agentId: 1000001,
        } as any,
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'corpSecret is required for WorkWeChat channel'
      );
    });

    it('should throw error when webhook channel missing webhookUrl', async () => {
      const input: CreateChannelInput = {
        name: 'Test DingTalk Channel',
        type: 'dingtalk',
        config: {} as any,
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'webhookUrl is required for dingtalk channel'
      );
    });

    it('should throw error when webhook channel has invalid webhookUrl format', async () => {
      const input: CreateChannelInput = {
        name: 'Test DingTalk Channel',
        type: 'dingtalk',
        config: {
          webhookUrl: 'not-a-valid-url',
        } as any,
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'Invalid webhookUrl format'
      );
    });

    it('should throw error when channel name is empty', async () => {
      const input: CreateChannelInput = {
        name: '   ',
        type: 'wechat',
        config: {
          appId: 'wx123456',
          appSecret: 'secret123',
        },
      };

      await expect(channelService.create(input)).rejects.toThrow(
        'Channel name is required'
      );
    });
  });

  describe('update', () => {
    const existingWeChatChannel: Channel = {
      id: 'ch_test123',
      name: 'Existing WeChat Channel',
      type: 'wechat',
      config: {
        appId: 'wx123456',
        appSecret: 'secret123',
        msgToken: 'token123',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const existingWorkWeChatChannel: Channel = {
      id: 'ch_test456',
      name: 'Existing WorkWeChat Channel',
      type: 'work_wechat',
      config: {
        corpId: 'corp123',
        agentId: 1000001,
        corpSecret: 'corpsecret123',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const existingWebhookChannel: Channel = {
      id: 'ch_test789',
      name: 'Existing DingTalk Channel',
      type: 'dingtalk',
      config: {
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        secret: 'SEC123',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should update WeChat channel config', async () => {
      mockChannelsKV.get.mockResolvedValue(existingWeChatChannel);
      mockChannelsKV.put.mockResolvedValue(undefined);

      const update: UpdateChannelInput = {
        config: {
          appSecret: 'newsecret456',
        },
      };

      const result = await channelService.update('ch_test123', update);

      expect(result.config).toMatchObject({
        appId: 'wx123456',
        appSecret: 'newsecret456',
        msgToken: 'token123',
      });
      expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should update WorkWeChat channel config', async () => {
      mockChannelsKV.get.mockResolvedValue(existingWorkWeChatChannel);
      mockChannelsKV.put.mockResolvedValue(undefined);

      const update: UpdateChannelInput = {
        config: {
          corpSecret: 'newcorpsecret456',
          agentId: 1000002,
        },
      };

      const result = await channelService.update('ch_test456', update);

      expect(result.config).toMatchObject({
        corpId: 'corp123',
        agentId: 1000002,
        corpSecret: 'newcorpsecret456',
      });
    });

    it('should update webhook channel config', async () => {
      mockChannelsKV.get.mockResolvedValue(existingWebhookChannel);
      mockChannelsKV.put.mockResolvedValue(undefined);

      const update: UpdateChannelInput = {
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=yyy',
        },
      };

      const result = await channelService.update('ch_test789', update);

      expect(result.config).toMatchObject({
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=yyy',
        secret: 'SEC123',
      });
    });

    it('should throw error when updating webhook with invalid URL', async () => {
      mockChannelsKV.get.mockResolvedValue(existingWebhookChannel);

      const update: UpdateChannelInput = {
        config: {
          webhookUrl: 'not-a-valid-url',
        },
      };

      await expect(channelService.update('ch_test789', update)).rejects.toThrow(
        'Invalid webhookUrl format'
      );
    });

    it('should throw error when channel not found', async () => {
      mockChannelsKV.get.mockResolvedValue(null);

      const update: UpdateChannelInput = {
        name: 'New Name',
      };

      await expect(channelService.update('ch_notfound', update)).rejects.toThrow(
        'Channel not found'
      );
    });
  });

  describe('maskChannel', () => {
    it('should mask WeChat channel credentials', () => {
      const channel: Channel = {
        id: 'ch_test123',
        name: 'Test WeChat Channel',
        type: 'wechat',
        config: {
          appId: 'wx123456',
          appSecret: 'secret123456',
          msgToken: 'token123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const masked = channelService.maskChannel(channel);

      expect(masked.config).toMatchObject({
        appId: 'wx123456',
        appSecret: 'secr****',
        msgToken: 'token123',
      });
    });

    it('should mask WorkWeChat channel credentials', () => {
      const channel: Channel = {
        id: 'ch_test456',
        name: 'Test WorkWeChat Channel',
        type: 'work_wechat',
        config: {
          corpId: 'corp123',
          agentId: 1000001,
          corpSecret: 'corpsecret123456',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const masked = channelService.maskChannel(channel);

      expect(masked.config).toMatchObject({
        corpId: 'corp123',
        agentId: 1000001,
        corpSecret: 'corp****',
      });
    });

    it('should mask webhook channel secret but not URL', () => {
      const channel: Channel = {
        id: 'ch_test789',
        name: 'Test DingTalk Channel',
        type: 'dingtalk',
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
          secret: 'SEC123456',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const masked = channelService.maskChannel(channel);

      expect(masked.config).toMatchObject({
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        secret: 'SEC1****',
      });
    });

    it('should handle webhook channel without secret', () => {
      const channel: Channel = {
        id: 'ch_test789',
        name: 'Test Feishu Channel',
        type: 'feishu',
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const masked = channelService.maskChannel(channel);

      expect(masked.config).toMatchObject({
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
        secret: undefined,
      });
    });
  });
});
