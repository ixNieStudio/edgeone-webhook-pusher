/**
 * AppService Unit Tests
 * 
 * 测试应用服务的动态配置功能
 * - 根据渠道类型创建不同配置的应用
 * - 配置字段验证
 * - 应用密钥唯一性
 * - 更新应用配置
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appService } from './app.service.js';
import { appsKV, channelsKV, openidsKV } from '../shared/kv-client.js';
import type { Channel, WeChatConfig, WorkWeChatConfig, WebhookConfig } from '../types/channel.js';
import type { CreateAppInput, UpdateAppInput, WeChatAppConfig, WorkWeChatAppConfig, WebhookAppConfig } from '../types/app.js';
import { PushModes, MessageTypes, ApiError } from '../types/index.js';

// Mock KV clients
vi.mock('../shared/kv-client.js', () => ({
  appsKV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  channelsKV: {
    get: vi.fn(),
  },
  openidsKV: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock utils
vi.mock('../shared/utils.js', () => {
  let keyCounter = 0;
  return {
    generateAppId: vi.fn(() => 'app_test_id'),
    generateAppKey: vi.fn(() => {
      keyCounter++;
      return `test_app_key_${keyCounter}`;
    }),
    now: vi.fn(() => '2024-01-01T00:00:00.000Z'),
  };
});

const mockAppsKV = vi.mocked(appsKV);
const mockChannelsKV = vi.mocked(channelsKV);
const mockOpenidsKV = vi.mocked(openidsKV);

describe('AppService - Dynamic Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing apps, key doesn't exist
    mockAppsKV.get.mockResolvedValue(null);
  });

  describe('创建微信应用', () => {
    const wechatChannel: Channel = {
      id: 'ch_wechat_1',
      name: '微信渠道',
      type: 'wechat',
      config: {
        appId: 'wx_test',
        appSecret: 'secret',
      } as WeChatConfig,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      mockChannelsKV.get.mockResolvedValue(wechatChannel);
      // Mock for key uniqueness check and app list
      mockAppsKV.get
        .mockResolvedValueOnce(null) // Key doesn't exist (uniqueness check)
        .mockResolvedValue([]); // Empty app list for subsequent calls
    });

    it('应该成功创建微信应用（单发模式）', async () => {
      const input: CreateAppInput = {
        name: '测试微信应用',
        channelId: wechatChannel.id,
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
      };

      const app = await appService.create(input);

      expect(app).toMatchObject({
        name: '测试微信应用',
        channelId: wechatChannel.id,
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
      });
      expect(app.id).toBeDefined();
      expect(app.key).toBeDefined();
      expect(app.createdAt).toBeDefined();
      expect(app.updatedAt).toBeDefined();
    });

    it('应该成功创建微信应用（订阅模式 + 模板消息）', async () => {
      const input: CreateAppInput = {
        name: '测试微信应用',
        channelId: wechatChannel.id,
        pushMode: PushModes.SUBSCRIBE,
        messageType: MessageTypes.TEMPLATE,
        templateId: 'template_123',
      };

      const app = await appService.create(input);

      expect(app).toMatchObject({
        channelType: 'wechat',
        pushMode: PushModes.SUBSCRIBE,
        messageType: MessageTypes.TEMPLATE,
        templateId: 'template_123',
      });
    });

    it('应该拒绝缺少 pushMode 的微信应用', async () => {
      const input: CreateAppInput = {
        name: '测试微信应用',
        channelId: wechatChannel.id,
      };

      await expect(appService.create(input)).rejects.toThrow('pushMode is required for WeChat channel');
    });

    it('应该拒绝无效的 pushMode', async () => {
      const input: CreateAppInput = {
        name: '测试微信应用',
        channelId: wechatChannel.id,
        pushMode: 'invalid' as any,
      };

      await expect(appService.create(input)).rejects.toThrow('pushMode must be one of');
    });

    it('应该拒绝模板消息缺少 templateId', async () => {
      const input: CreateAppInput = {
        name: '测试微信应用',
        channelId: wechatChannel.id,
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.TEMPLATE,
      };

      await expect(appService.create(input)).rejects.toThrow('templateId is required when messageType is template');
    });
  });

  describe('创建企业微信应用', () => {
    const workWechatChannel: Channel = {
      id: 'ch_work_wechat_1',
      name: '企业微信渠道',
      type: 'work_wechat',
      config: {
        corpId: 'corp_test',
        agentId: 1000001,
        corpSecret: 'secret',
      } as WorkWeChatConfig,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      mockChannelsKV.get.mockResolvedValue(workWechatChannel);
      // Mock for key uniqueness check and app list
      mockAppsKV.get
        .mockResolvedValueOnce(null) // Key doesn't exist (uniqueness check)
        .mockResolvedValue([]); // Empty app list for subsequent calls
    });

    it('应该成功创建企业微信应用（用户ID列表）', async () => {
      const input: CreateAppInput = {
        name: '测试企业微信应用',
        channelId: workWechatChannel.id,
        userIds: ['user1', 'user2', 'user3'],
      };

      const app = await appService.create(input);

      expect(app).toMatchObject({
        channelType: 'work_wechat',
        userIds: ['user1', 'user2', 'user3'],
        messageType: 'text',
      });
      expect(app).not.toHaveProperty('pushMode');
      expect(app).not.toHaveProperty('templateId');
    });

    it('应该成功创建企业微信应用（部门ID列表）', async () => {
      const input: CreateAppInput = {
        name: '测试企业微信应用',
        channelId: workWechatChannel.id,
        departmentIds: ['dept1', 'dept2'],
      };

      const app = await appService.create(input);

      expect(app).toMatchObject({
        channelType: 'work_wechat',
        departmentIds: ['dept1', 'dept2'],
        messageType: 'text', // 默认值
      });
    });

    it('应该成功创建企业微信应用（用户ID + 部门ID）', async () => {
      const input: CreateAppInput = {
        name: '测试企业微信应用',
        channelId: workWechatChannel.id,
        userIds: ['user1'],
        departmentIds: ['dept1'],
      };

      const app = await appService.create(input);

      expect(app).toMatchObject({
        channelType: 'work_wechat',
        userIds: ['user1'],
        departmentIds: ['dept1'],
        messageType: 'text',
      });
    });

    it('应该拒绝缺少 userIds 和 departmentIds 的企业微信应用', async () => {
      const input: CreateAppInput = {
        name: '测试企业微信应用',
        channelId: workWechatChannel.id,
      };

      await expect(appService.create(input)).rejects.toThrow(
        'At least one of userIds or departmentIds is required for WorkWeChat channel'
      );
    });

    it('应该拒绝空的 userIds 和 departmentIds', async () => {
      const input: CreateAppInput = {
        name: '测试企业微信应用',
        channelId: workWechatChannel.id,
        userIds: [],
        departmentIds: [],
      };

      await expect(appService.create(input)).rejects.toThrow(
        'At least one of userIds or departmentIds is required for WorkWeChat channel'
      );
    });
  });

  describe('创建 Webhook 应用', () => {
    const dingtalkChannel: Channel = {
      id: 'ch_dingtalk_1',
      name: '钉钉渠道',
      type: 'dingtalk',
      config: {
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      } as WebhookConfig,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const feishuChannel: Channel = {
      id: 'ch_feishu_1',
      name: '飞书渠道',
      type: 'feishu',
      config: {
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
      } as WebhookConfig,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      // Mock for key uniqueness check and app list
      mockAppsKV.get
        .mockResolvedValueOnce(null) // Key doesn't exist (uniqueness check)
        .mockResolvedValue([]); // Empty app list for subsequent calls
    });

    it('应该成功创建钉钉应用', async () => {
      mockChannelsKV.get.mockResolvedValue(dingtalkChannel);

      const input: CreateAppInput = {
        name: '测试钉钉应用',
        channelId: dingtalkChannel.id,
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=custom',
        atMobiles: ['13800138000'],
        atAll: false,
      };

      const app = await appService.create(input);

      expect(app).toMatchObject({
        channelType: 'dingtalk',
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=custom',
        atMobiles: ['13800138000'],
        atAll: false,
      });
      expect(app).not.toHaveProperty('pushMode');
      expect(app).not.toHaveProperty('userIds');
    });

    it('应该成功创建飞书应用', async () => {
      mockChannelsKV.get.mockResolvedValue(feishuChannel);

      const input: CreateAppInput = {
        name: '测试飞书应用',
        channelId: feishuChannel.id,
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/custom',
      };

      const app = await appService.create(input);

      expect(app).toMatchObject({
        channelType: 'feishu',
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/custom',
      });
    });

    it('应该拒绝缺少 webhookUrl 的钉钉应用', async () => {
      mockChannelsKV.get.mockResolvedValue(dingtalkChannel);

      const input: CreateAppInput = {
        name: '测试钉钉应用',
        channelId: dingtalkChannel.id,
      };

      await expect(appService.create(input)).rejects.toThrow('webhookUrl is required for dingtalk channel');
    });

    it('应该拒绝缺少 webhookUrl 的飞书应用', async () => {
      mockChannelsKV.get.mockResolvedValue(feishuChannel);

      const input: CreateAppInput = {
        name: '测试飞书应用',
        channelId: feishuChannel.id,
      };

      await expect(appService.create(input)).rejects.toThrow('webhookUrl is required for feishu channel');
    });
  });

  describe('应用密钥唯一性', () => {
    const channel: Channel = {
      id: 'ch_test',
      name: '测试渠道',
      type: 'wechat',
      config: { appId: 'test', appSecret: 'secret' } as WeChatConfig,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('应该生成唯一的应用密钥', async () => {
      mockChannelsKV.get.mockResolvedValue(channel);
      // Mock: 第一次检查返回已存在，第二次返回不存在
      mockAppsKV.get
        .mockResolvedValueOnce('existing_app_id') // 第一次：key 已存在
        .mockResolvedValueOnce(null) // 第二次：key 不存在
        .mockResolvedValue([]); // 后续：app list

      const input: CreateAppInput = {
        name: '测试应用',
        channelId: channel.id,
        pushMode: PushModes.SINGLE,
      };

      const app = await appService.create(input);

      expect(app.key).toBeDefined();
      // 应该调用了 get 来检查 key 是否存在（至少2次）
      expect(mockAppsKV.get).toHaveBeenCalled();
    });

    it('应该在多次冲突后抛出错误', async () => {
      mockChannelsKV.get.mockResolvedValue(channel);
      // Clear the default mock and set up specific behavior
      mockAppsKV.get.mockReset();
      // Mock: 前10次检查都返回已存在（触发重试限制）
      for (let i = 0; i < 15; i++) {
        mockAppsKV.get.mockResolvedValueOnce('existing_app_id');
      }

      const input: CreateAppInput = {
        name: '测试应用',
        channelId: channel.id,
        pushMode: PushModes.SINGLE,
      };

      await expect(appService.create(input)).rejects.toThrow('Failed to generate unique app key');
    });
  });

  describe('更新应用配置', () => {
    it('应该成功更新微信应用的 templateId', async () => {
      const existingApp: WeChatAppConfig = {
        id: 'app_1',
        key: 'key_1',
        name: '测试应用',
        channelId: 'ch_1',
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.TEMPLATE,
        templateId: 'old_template',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Override the default mock for this test
      mockAppsKV.get.mockReset();
      mockAppsKV.get.mockResolvedValue(existingApp);

      const update: UpdateAppInput = {
        templateId: 'new_template',
      };

      const updated = await appService.update('app_1', update);

      expect(updated.channelType).toBe('wechat');
      if (updated.channelType === 'wechat') {
        expect(updated.templateId).toBe('new_template');
      }
      expect(mockAppsKV.put).toHaveBeenCalled();
    });

    it('应该成功更新企业微信应用的 userIds', async () => {
      const existingApp: WorkWeChatAppConfig = {
        id: 'app_1',
        key: 'key_1',
        name: '测试应用',
        channelId: 'ch_1',
        channelType: 'work_wechat',
        userIds: ['user1'],
        messageType: 'text',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAppsKV.get.mockReset();
      mockAppsKV.get.mockResolvedValue(existingApp);

      const update: UpdateAppInput = {
        userIds: ['user1', 'user2', 'user3'],
      };

      const updated = await appService.update('app_1', update);

      expect(updated.channelType).toBe('work_wechat');
      if (updated.channelType === 'work_wechat') {
        expect(updated.userIds).toEqual(['user1', 'user2', 'user3']);
      }
    });

    it('应该成功更新企业微信应用的 departmentIds', async () => {
      const existingApp: WorkWeChatAppConfig = {
        id: 'app_1',
        key: 'key_1',
        name: '测试应用',
        channelId: 'ch_1',
        channelType: 'work_wechat',
        departmentIds: ['dept1'],
        messageType: 'text',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAppsKV.get.mockReset();
      mockAppsKV.get.mockResolvedValue(existingApp);

      const update: UpdateAppInput = {
        departmentIds: ['dept1', 'dept2'],
      };

      const updated = await appService.update('app_1', update);

      expect(updated.channelType).toBe('work_wechat');
      if (updated.channelType === 'work_wechat') {
        expect(updated.departmentIds).toEqual(['dept1', 'dept2']);
      }
    });

    it('应该拒绝清空企业微信应用的所有目标', async () => {
      const existingApp: WorkWeChatAppConfig = {
        id: 'app_1',
        key: 'key_1',
        name: '测试应用',
        channelId: 'ch_1',
        channelType: 'work_wechat',
        userIds: ['user1'],
        messageType: 'text',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAppsKV.get.mockReset();
      mockAppsKV.get.mockResolvedValue(existingApp);

      const update: UpdateAppInput = {
        userIds: [],
      };

      await expect(appService.update('app_1', update)).rejects.toThrow(
        'At least one of userIds or departmentIds is required for WorkWeChat channel'
      );
    });

    it('应该成功更新钉钉应用的 webhookUrl', async () => {
      const existingApp: WebhookAppConfig = {
        id: 'app_1',
        key: 'key_1',
        name: '测试应用',
        channelId: 'ch_1',
        channelType: 'dingtalk',
        webhookUrl: 'https://old.url',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAppsKV.get.mockReset();
      mockAppsKV.get.mockResolvedValue(existingApp);

      const update: UpdateAppInput = {
        webhookUrl: 'https://new.url',
      };

      const updated = await appService.update('app_1', update);

      expect(updated.channelType).toBe('dingtalk');
      if (updated.channelType === 'dingtalk' || updated.channelType === 'feishu') {
        expect(updated.webhookUrl).toBe('https://new.url');
      }
    });

    it('应该拒绝清空钉钉应用的 webhookUrl', async () => {
      const existingApp: WebhookAppConfig = {
        id: 'app_1',
        key: 'key_1',
        name: '测试应用',
        channelId: 'ch_1',
        channelType: 'dingtalk',
        webhookUrl: 'https://old.url',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAppsKV.get.mockReset();
      mockAppsKV.get.mockResolvedValue(existingApp);

      const update: UpdateAppInput = {
        webhookUrl: '',
      };

      await expect(appService.update('app_1', update)).rejects.toThrow(
        'webhookUrl cannot be empty for DingTalk channel'
      );
    });
  });

  describe('通用验证', () => {
    it('应该拒绝空的应用名称', async () => {
      const input: CreateAppInput = {
        name: '   ',
        channelId: 'ch_1',
        pushMode: PushModes.SINGLE,
      };

      await expect(appService.create(input)).rejects.toThrow('App name is required');
    });

    it('应该拒绝不存在的渠道', async () => {
      mockChannelsKV.get.mockResolvedValue(null);

      const input: CreateAppInput = {
        name: '测试应用',
        channelId: 'non_existent',
        pushMode: PushModes.SINGLE,
      };

      await expect(appService.create(input)).rejects.toThrow('Channel not found');
    });

    it('应该拒绝不支持的渠道类型', async () => {
      const unsupportedChannel: Channel = {
        id: 'ch_unsupported',
        name: '不支持的渠道',
        type: 'unsupported' as any,
        config: {} as any,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockChannelsKV.get.mockResolvedValue(unsupportedChannel);
      mockAppsKV.get.mockResolvedValue([]);

      const input: CreateAppInput = {
        name: '测试应用',
        channelId: unsupportedChannel.id,
      };

      await expect(appService.create(input)).rejects.toThrow('Unsupported channel type');
    });
  });
});
