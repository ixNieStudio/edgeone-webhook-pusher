/**
 * PushService Integration Tests
 * 
 * 测试 PushService 与策略模式的集成
 * - 微信渠道完整流程
 * - 企业微信渠道完整流程
 * - 多渠道并存场景
 * 
 * 注意：这些是集成测试，使用 mock 服务层和 API 调用
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Channel, WeChatConfig, WorkWeChatConfig } from '../../types/channel.js';
import type { WeChatAppConfig, WorkWeChatAppConfig } from '../../types/app.js';
import type { PushMessageInput } from '../../types/message.js';
import type { OpenID } from '../../types/openid.js';
import { PushModes, MessageTypes } from '../../types/index.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the service imports BEFORE creating mock objects
vi.mock('../app.service.js', () => ({
  appService: {
    getByKey: vi.fn(),
  },
}));

vi.mock('../channel.service.js', () => ({
  channelService: {
    getById: vi.fn(),
  },
}));

vi.mock('../app-config.service.js', () => ({
  appConfigService: {
    resolveApp: vi.fn(),
  },
}));

vi.mock('../openid.service.js', () => ({
  openidService: {
    listByApp: vi.fn(),
    getFirstOpenIdByApp: vi.fn(),
    listOpenIdValuesByApp: vi.fn(),
  },
}));

vi.mock('../send-profile.service.js', () => ({
  sendProfileService: {
    getByAppKey: vi.fn(),
  },
}));

vi.mock('../message.service.js', () => ({
  messageService: {
    saveMessage: vi.fn(),
  },
}));

vi.mock('../message-detail.service.js', () => ({
  messageDetailService: {
    createSnapshot: vi.fn(),
    getPublicDetail: vi.fn(),
  },
}));

// Import after mocking
import { pushService } from '../push.service.js';
import { appService } from '../app.service.js';
import { channelService } from '../channel.service.js';
import { appConfigService } from '../app-config.service.js';
import { openidService } from '../openid.service.js';
import { sendProfileService } from '../send-profile.service.js';
import { messageService } from '../message.service.js';
import { messageDetailService } from '../message-detail.service.js';

// Type the mocked services
const mockAppService = vi.mocked(appService);
const mockChannelService = vi.mocked(channelService);
const mockAppConfigService = vi.mocked(appConfigService);
const mockOpenidService = vi.mocked(openidService);
const mockSendProfileService = vi.mocked(sendProfileService);
const mockMessageService = vi.mocked(messageService);
const mockMessageDetailService = vi.mocked(messageDetailService);

describe('PushService Integration Tests', () => {
  const originalBuildKey = process.env.BUILD_KEY;

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks();
    process.env.BUILD_KEY = 'EdgeOne-Pusher_Test-Key!2026';
    mockMessageService.saveMessage.mockResolvedValue(undefined);
    mockMessageDetailService.createSnapshot.mockResolvedValue({
      token: 'md_test_token',
      detailPageUrl: 'https://pusher.example.com/open/messages/md_test_token',
    });
    mockAppConfigService.resolveApp.mockImplementation(async (app: any) => {
      const channel = await mockChannelService.getById(app.channelId);
      if (!channel) {
        throw new Error(`Channel not found for app ${app.id}`);
      }

      const defaultSendType = app.channelType === 'wechat'
        ? (app.messageType === MessageTypes.TEMPLATE ? 'page' : 'text')
        : app.channelType === 'work_wechat'
          ? (app.messageType === 'template_card' ? 'page' : 'text')
          : undefined;

      return {
        deliveryConfig: {
          appId: app.id,
          deliveryType: app.channelType,
          connectionMode: 'auth_profile_ref',
          authProfileId: channel.id,
          messageProfile: {
            renderer: 'text',
            defaultSendType,
            atMobiles: app.atMobiles,
            atAll: app.atAll,
          },
          recipientProfile: app.channelType === 'wechat'
            ? {
                mode: app.pushMode ?? PushModes.SINGLE,
                pushMode: app.pushMode ?? PushModes.SINGLE,
              }
            : {
                mode: 'fixed_targets',
                userIds: app.userIds ?? [],
                departmentIds: app.departmentIds ?? [],
              },
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        },
        resolved: {
          appId: app.id,
          appKey: app.key,
          appName: app.name,
          deliveryType: app.channelType,
          runtimeChannelId: channel.id,
          authProfileId: channel.id,
          renderer: 'text',
          defaultSendType,
          contentFormatDefault: 'text',
          jumpBehavior: 'none',
          pushMode: app.pushMode,
          userIds: app.userIds,
          departmentIds: app.departmentIds,
          atMobiles: app.atMobiles,
          atAll: app.atAll,
        },
        runtimeChannel: channel,
        authProfile: channel,
        legacy: {
          usesLegacyChannel: true,
          usesInlineWebhookFallback: false,
        },
      };
    });
    mockSendProfileService.getByAppKey.mockImplementation(async (appKey: string) => {
      const app = await mockAppService.getByKey(appKey);
      if (!app) {
        return null;
      }

      const resolvedContext = await mockAppConfigService.resolveApp(app as any);
      const targets = await (resolvedContext.resolved.deliveryType === 'wechat'
        ? ((resolvedContext.resolved.pushMode ?? (app as any).pushMode) === PushModes.SINGLE
            ? (() => mockOpenidService.getFirstOpenIdByApp(app.id).then((value) => value ? [value] : []))()
            : mockOpenidService.listOpenIdValuesByApp(app.id))
        : [
            ...(resolvedContext.resolved.userIds ?? []),
            ...((resolvedContext.resolved.departmentIds ?? []).map((id: string) => `dept_${id}`)),
          ]);

      return {
        app: {
          id: app.id,
          key: app.key,
          name: app.name,
          channelType: app.channelType,
        },
        message: {
          renderer: resolvedContext.resolved.renderer,
          defaultSendType: resolvedContext.resolved.defaultSendType,
          contentFormatDefault: resolvedContext.resolved.contentFormatDefault,
          jumpBehavior: resolvedContext.resolved.jumpBehavior,
          templateId: resolvedContext.resolved.templateId,
          fieldMap: resolvedContext.resolved.fieldMap,
          templateProfiles: resolvedContext.resolved.templateProfiles,
          fallbackToText: resolvedContext.resolved.fallbackToText,
          atMobiles: resolvedContext.resolved.atMobiles,
          atAll: resolvedContext.resolved.atAll,
        },
        channel: {
          id: resolvedContext.runtimeChannel.id,
          type: resolvedContext.runtimeChannel.type,
          config: resolvedContext.runtimeChannel.config,
        },
        targets,
        updatedAt: new Date().toISOString(),
      };
    });
  });

  afterEach(() => {
    if (originalBuildKey === undefined) {
      delete process.env.BUILD_KEY;
      return;
    }
    process.env.BUILD_KEY = originalBuildKey;
  });

  describe('微信渠道完整流程', () => {
    it('应该成功发送微信客服消息（单发模式）', async () => {
      // 1. Mock 微信渠道
      const channel: Channel = {
        id: 'ch_wechat_1',
        name: '测试微信渠道',
        type: 'wechat',
        config: {
          appId: 'wx_test_appid',
          appSecret: 'wx_test_secret',
        } as WeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2. Mock 微信应用（单发模式）
      const app: WeChatAppConfig = {
        id: 'app_wechat_1',
        key: 'test_wechat_key',
        name: '测试微信应用',
        channelId: channel.id,
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Mock OpenID 列表
      const openIds: OpenID[] = [
        {
          id: 'oid_1',
          appId: app.id,
          openId: 'openid_user1',
          nickname: '用户1',
          avatar: 'https://example.com/avatar1.jpg',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'oid_2',
          appId: app.id,
          openId: 'openid_user2',
          nickname: '用户2',
          avatar: 'https://example.com/avatar2.jpg',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // 4. 设置 mock 返回值
      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);
      mockOpenidService.getFirstOpenIdByApp.mockResolvedValue(openIds[0].openId);

      // 5. Mock 微信 API 响应（包括 KV 缓存）
      (global.fetch as any).mockImplementation((url: string) => {
        // Mock KV cache GET (返回 null 表示缓存未命中)
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        }
        // Mock KV cache PUT
        else if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        // Mock 微信 token API
        else if (url.includes('/cgi-bin/token')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              access_token: 'mock_access_token',
              expires_in: 7200,
            }),
          });
        }
        // Mock 微信发送消息 API
        else if (url.includes('/message/custom/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 123456,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      // 6. 发送消息
      const message: PushMessageInput = {
        title: '测试标题',
        desp: '测试内容',
      };
      const result = await pushService.push(app.key, message);

      // 7. 验证结果
      expect(result.total).toBe(1); // 单发模式只发送给第一个用户
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results![0].openId).toBe('openid_user1');
      expect(result.results![0].success).toBe(true);
      expect(result.results![0].msgId).toBe('123456');

      // 8. 验证消息历史已保存
      expect(mockMessageService.saveMessage).toHaveBeenCalledTimes(1);
      expect(mockMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: result.pushId,
          direction: 'outbound',
          appId: app.id,
          channelId: channel.id,
        })
      );
    });

    it('应该在默认网页模式下发送微信详情页消息（订阅模式）', async () => {
      // 1. Mock 微信渠道和应用
      const channel: Channel = {
        id: 'ch_wechat_2',
        name: '测试微信渠道',
        type: 'wechat',
        config: {
          appId: 'wx_test_appid',
          appSecret: 'wx_test_secret',
        } as WeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WeChatAppConfig = {
        id: 'app_wechat_2',
        key: 'test_wechat_template_key',
        name: '测试微信网页应用',
        channelId: channel.id,
        channelType: 'wechat',
        pushMode: PushModes.SUBSCRIBE,
        messageType: MessageTypes.TEMPLATE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const openIds: OpenID[] = [
        {
          id: 'oid_3',
          appId: app.id,
          openId: 'openid_user3',
          nickname: '用户3',
          avatar: 'https://example.com/avatar3.jpg',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'oid_4',
          appId: app.id,
          openId: 'openid_user4',
          nickname: '用户4',
          avatar: 'https://example.com/avatar4.jpg',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);
      mockOpenidService.listOpenIdValuesByApp.mockResolvedValue(openIds.map((item) => item.openId));

      // 2. Mock 微信 API 响应（包括 KV 缓存）
      (global.fetch as any).mockImplementation((url: string) => {
        // Mock KV cache
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        } else if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        // Mock 微信 token API
        else if (url.includes('/cgi-bin/token')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              access_token: 'mock_access_token',
              expires_in: 7200,
            }),
          });
        }
        // Mock 微信客服消息 API
        else if (url.includes('/message/custom/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 789012,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      // 3. 发送消息
      const message: PushMessageInput = {
        title: '网页消息标题',
        desp: '网页消息正文，用于自动生成详情页摘要。',
      };
      const result = await pushService.push(app.key, message);

      // 4. 验证结果
      expect(result.total).toBe(2); // 订阅模式发送给所有用户
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results!.every(r => r.success)).toBe(true);
      expect(mockMessageDetailService.createSnapshot).toHaveBeenCalledTimes(1);
      expect(mockMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          detailPageUrl: 'https://pusher.example.com/open/messages/md_test_token',
          jumpMode: 'landing',
        })
      );
    });

    it('应该为网页类型消息生成公开详情页', async () => {
      const channel: Channel = {
        id: 'ch_wechat_markdown',
        name: '测试微信渠道',
        type: 'wechat',
        config: {
          appId: 'wx_test_appid',
          appSecret: 'wx_test_secret',
        } as WeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WeChatAppConfig = {
        id: 'app_wechat_markdown',
        key: 'test_wechat_markdown_key',
        name: '测试 Markdown 应用',
        channelId: channel.id,
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);
      mockOpenidService.getFirstOpenIdByApp.mockResolvedValue('openid_markdown_1');

      const requestBodies: Array<Record<string, unknown>> = [];
      (global.fetch as any).mockImplementation((url: string, init?: { body?: string }) => {
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        }
        if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        if (url.includes('/cgi-bin/token')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              access_token: 'mock_access_token',
              expires_in: 7200,
            }),
          });
        }
        if (url.includes('/message/custom/send')) {
          requestBodies.push(JSON.parse(init?.body || '{}'));
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 456789,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      const result = await pushService.push(app.key, {
        title: '网页告警',
        desp: '这里是一段用于生成详情页摘要和正文的网页内容。',
        type: 'page',
      }, {
        baseUrl: 'https://pusher.example.com',
      });

      expect(result.success).toBe(1);
      expect(mockMessageDetailService.createSnapshot).toHaveBeenCalledTimes(1);
      expect(mockMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          contentFormat: 'text',
          detailPageUrl: 'https://pusher.example.com/open/messages/md_test_token',
          jumpMode: 'landing',
        })
      );
      expect(requestBodies[0].text.content).toContain('详情：https://pusher.example.com/open/messages/md_test_token');
    });

    it('网页类型消息会忽略外部 url 并生成项目详情页', async () => {
      const channel: Channel = {
        id: 'ch_wechat_web_url',
        name: '测试微信渠道',
        type: 'wechat',
        config: {
          appId: 'wx_test_appid',
          appSecret: 'wx_test_secret',
        } as WeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WeChatAppConfig = {
        id: 'app_wechat_web_url',
        key: 'test_wechat_web_url_key',
        name: '测试微信网页应用',
        channelId: channel.id,
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);
      mockOpenidService.getFirstOpenIdByApp.mockResolvedValue('openid_web_1');

      const result = await pushService.push(app.key, {
        title: '网页消息',
        desp: '网页内容',
        type: 'page',
        url: 'https://example.com/detail?id=123',
      }, {
        baseUrl: 'https://pusher.example.com',
      });

      expect(result.success).toBe(1);
      expect(mockMessageDetailService.createSnapshot).toHaveBeenCalledTimes(1);
      expect(mockMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          originalUrl: undefined,
          detailPageUrl: 'https://pusher.example.com/open/messages/md_test_token',
          jumpMode: 'landing',
        })
      );
    });

    it('应该允许在默认网页应用中显式覆盖为文本发送', async () => {
      const channel: Channel = {
        id: 'ch_wechat_template_profile',
        name: '测试微信渠道',
        type: 'wechat',
        config: {
          appId: 'wx_test_appid',
          appSecret: 'wx_test_secret',
        } as WeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WeChatAppConfig = {
        id: 'app_wechat_template_profile',
        key: 'test_wechat_template_profile_key',
        name: '测试默认网页应用',
        channelId: channel.id,
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.TEMPLATE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);
      mockOpenidService.getFirstOpenIdByApp.mockResolvedValue('openid_template_profile_1');

      const requestBodies: Array<Record<string, unknown>> = [];
      (global.fetch as any).mockImplementation((url: string, init?: { body?: string }) => {
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        }
        if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        if (url.includes('/cgi-bin/token')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              access_token: 'mock_access_token',
              expires_in: 7200,
            }),
          });
        }
        if (url.includes('/message/custom/send')) {
          requestBodies.push(JSON.parse(init?.body || '{}'));
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 567890,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      const result = await pushService.push(app.key, {
        title: '覆盖发送为文本',
        desp: '这一条应按普通文本链路发送。',
        type: 'text',
        url: 'https://example.com/detail?id=1001',
      }, {
        baseUrl: 'https://pusher.example.com',
      });

      expect(result.success).toBe(1);
      expect(requestBodies[0].msgtype).toBe('text');
      expect(requestBodies[0].text.content).toContain('链接：https://example.com/detail?id=1001');
      expect(mockMessageDetailService.createSnapshot).not.toHaveBeenCalled();
      expect(mockMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          originalUrl: 'https://example.com/detail?id=1001',
          jumpMode: 'direct',
        })
      );
    });
  });

  describe('企业微信渠道完整流程', () => {
    it('应该成功发送企业微信消息给指定用户', async () => {
      // 1. Mock 企业微信渠道
      const channel: Channel = {
        id: 'ch_work_wechat_1',
        name: '测试企业微信渠道',
        type: 'work_wechat',
        config: {
          corpId: 'corp_test_id',
          agentId: 1000001,
          corpSecret: 'corp_test_secret',
        } as WorkWeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2. Mock 企业微信应用
      const app: WorkWeChatAppConfig = {
        id: 'app_work_wechat_1',
        key: 'test_work_wechat_key',
        name: '测试企业微信应用',
        channelId: channel.id,
        channelType: 'work_wechat',
        userIds: ['user001', 'user002'],
        messageType: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);

      // 3. Mock 企业微信 API 响应（包括 KV 缓存）
      (global.fetch as any).mockImplementation((url: string) => {
        // Mock KV cache
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        } else if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        // Mock 企业微信 token API
        else if (url.includes('/cgi-bin/gettoken')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              access_token: 'mock_work_wechat_token',
              expires_in: 7200,
            }),
          });
        }
        // Mock 企业微信发送消息 API
        else if (url.includes('/cgi-bin/message/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 'msg_work_wechat_123',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      // 4. 发送消息
      const message: PushMessageInput = {
        title: '企业微信测试标题',
        desp: '企业微信测试内容',
      };
      const result = await pushService.push(app.key, message);

      // 5. 验证结果
      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results![0].openId).toBe('user001');
      expect(result.results![1].openId).toBe('user002');
      expect(result.results!.every(r => r.success)).toBe(true);
    });

    it('企业微信网页类型消息会忽略外部 url 并生成项目详情页', async () => {
      const channel: Channel = {
        id: 'ch_work_wechat_web_url',
        name: '测试企业微信渠道',
        type: 'work_wechat',
        config: {
          corpId: 'corp_test_id',
          agentId: 1000001,
          corpSecret: 'corp_test_secret',
        } as WorkWeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WorkWeChatAppConfig = {
        id: 'app_work_wechat_web_url',
        key: 'test_work_wechat_web_url_key',
        name: '测试企业微信网页应用',
        channelId: channel.id,
        channelType: 'work_wechat',
        userIds: ['user001'],
        messageType: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        }
        if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        if (url.includes('/cgi-bin/gettoken')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              access_token: 'mock_work_wechat_token',
              expires_in: 7200,
            }),
          });
        }
        if (url.includes('/cgi-bin/message/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 'msg_work_wechat_456',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      const result = await pushService.push(app.key, {
        title: '网页消息',
        desp: '企业微信网页内容',
        type: 'page',
        url: 'https://example.com/detail?id=456',
      }, {
        baseUrl: 'https://pusher.example.com',
      });

      expect(result.success).toBe(1);
      expect(mockMessageDetailService.createSnapshot).toHaveBeenCalledTimes(1);
      expect(mockMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          originalUrl: undefined,
          detailPageUrl: 'https://pusher.example.com/open/messages/md_test_token',
          jumpMode: 'landing',
        })
      );
    });

    it('应该成功发送企业微信消息给指定部门', async () => {
      // 1. Mock 企业微信渠道和应用
      const channel: Channel = {
        id: 'ch_work_wechat_2',
        name: '测试企业微信渠道',
        type: 'work_wechat',
        config: {
          corpId: 'corp_test_id',
          agentId: 1000001,
          corpSecret: 'corp_test_secret',
        } as WorkWeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WorkWeChatAppConfig = {
        id: 'app_work_wechat_2',
        key: 'test_work_wechat_dept_key',
        name: '测试企业微信部门应用',
        channelId: channel.id,
        channelType: 'work_wechat',
        departmentIds: ['1', '2'],
        messageType: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);

      // 2. Mock 企业微信 API 响应（包括 KV 缓存）
      (global.fetch as any).mockImplementation((url: string) => {
        // Mock KV cache
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        } else if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        // Mock 企业微信 token API
        else if (url.includes('/cgi-bin/gettoken')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              access_token: 'mock_work_wechat_token',
              expires_in: 7200,
            }),
          });
        }
        // Mock 企业微信发送消息 API
        else if (url.includes('/cgi-bin/message/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 'msg_dept_123',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      // 3. 发送消息
      const message: PushMessageInput = {
        title: '部门通知',
        desp: '这是发送给部门的消息',
      };
      const result = await pushService.push(app.key, message);

      // 4. 验证结果
      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results![0].openId).toBe('dept_1');
      expect(result.results![1].openId).toBe('dept_2');
    });

    it('应该同时发送给用户和部门', async () => {
      // 1. Mock 企业微信渠道和应用
      const channel: Channel = {
        id: 'ch_work_wechat_3',
        name: '测试企业微信渠道',
        type: 'work_wechat',
        config: {
          corpId: 'corp_test_id',
          agentId: 1000001,
          corpSecret: 'corp_test_secret',
        } as WorkWeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WorkWeChatAppConfig = {
        id: 'app_work_wechat_3',
        key: 'test_work_wechat_mixed_key',
        name: '测试企业微信混合应用',
        channelId: channel.id,
        channelType: 'work_wechat',
        userIds: ['user001', 'user002'],
        departmentIds: ['1'],
        messageType: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);

      // 2. Mock 企业微信 API 响应（包括 KV 缓存）
      (global.fetch as any).mockImplementation((url: string) => {
        // Mock KV cache
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        } else if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        // Mock 企业微信 token API
        else if (url.includes('/cgi-bin/gettoken')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              access_token: 'mock_work_wechat_token',
              expires_in: 7200,
            }),
          });
        }
        // Mock 企业微信发送消息 API
        else if (url.includes('/cgi-bin/message/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 'msg_mixed_123',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      // 3. 发送消息
      const message: PushMessageInput = {
        title: '混合通知',
        desp: '发送给用户和部门',
      };
      const result = await pushService.push(app.key, message);

      // 4. 验证结果
      expect(result.total).toBe(3); // 2个用户 + 1个部门
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results![0].openId).toBe('user001');
      expect(result.results![1].openId).toBe('user002');
      expect(result.results![2].openId).toBe('dept_1');
    });
  });

  describe('多渠道并存场景', () => {
    it('应该支持同时使用微信和企业微信渠道', async () => {
      // 1. Mock 微信渠道和应用
      const wechatChannel: Channel = {
        id: 'ch_multi_wechat',
        name: '微信渠道',
        type: 'wechat',
        config: {
          appId: 'wx_test_appid',
          appSecret: 'wx_test_secret',
        } as WeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const wechatApp: WeChatAppConfig = {
        id: 'app_multi_wechat',
        key: 'multi_wechat_key',
        name: '微信应用',
        channelId: wechatChannel.id,
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const wechatOpenIds: OpenID[] = [
        {
          id: 'oid_multi_1',
          appId: wechatApp.id,
          openId: 'wechat_openid_1',
          nickname: '微信用户',
          avatar: 'https://example.com/avatar.jpg',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // 2. Mock 企业微信渠道和应用
      const workWechatChannel: Channel = {
        id: 'ch_multi_work_wechat',
        name: '企业微信渠道',
        type: 'work_wechat',
        config: {
          corpId: 'corp_test_id',
          agentId: 1000001,
          corpSecret: 'corp_test_secret',
        } as WorkWeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const workWechatApp: WorkWeChatAppConfig = {
        id: 'app_multi_work_wechat',
        key: 'multi_work_wechat_key',
        name: '企业微信应用',
        channelId: workWechatChannel.id,
        channelType: 'work_wechat',
        userIds: ['work_user_1'],
        messageType: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Mock API 响应（包括 KV 缓存）
      (global.fetch as any).mockImplementation((url: string) => {
        // Mock KV cache
        if (url.includes('/api/kv/new-kv') && url.includes('action=get')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, data: null }),
          });
        } else if (url.includes('/api/kv/new-kv') && url.includes('action=put')) {
          return Promise.resolve({
            json: () => Promise.resolve({ success: true }),
          });
        }
        // Mock 微信 token API
        else if (url.includes('api.weixin.qq.com/cgi-bin/token')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              access_token: 'wechat_token',
              expires_in: 7200,
            }),
          });
        }
        // Mock 微信发送消息 API
        else if (url.includes('api.weixin.qq.com/cgi-bin/message/custom/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 111,
            }),
          });
        }
        // Mock 企业微信 token API
        else if (url.includes('qyapi.weixin.qq.com/cgi-bin/gettoken')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              access_token: 'work_wechat_token',
              expires_in: 7200,
            }),
          });
        }
        // Mock 企业微信发送消息 API
        else if (url.includes('qyapi.weixin.qq.com/cgi-bin/message/send')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              errcode: 0,
              errmsg: 'ok',
              msgid: 'work_msg_222',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      // 4. 分别发送消息到两个渠道
      const message: PushMessageInput = {
        title: '多渠道测试',
        desp: '测试内容',
      };

      // 微信渠道
      mockAppService.getByKey.mockResolvedValueOnce(wechatApp);
      mockChannelService.getById.mockResolvedValueOnce(wechatChannel);
      mockOpenidService.getFirstOpenIdByApp.mockResolvedValueOnce(wechatOpenIds[0].openId);
      const wechatResult = await pushService.push(wechatApp.key, message);

      // 企业微信渠道
      mockAppService.getByKey.mockResolvedValueOnce(workWechatApp);
      mockChannelService.getById.mockResolvedValueOnce(workWechatChannel);
      const workWechatResult = await pushService.push(workWechatApp.key, message);

      // 5. 验证结果
      expect(wechatResult.success).toBe(1);
      expect(wechatResult.results![0].openId).toBe('wechat_openid_1');

      expect(workWechatResult.success).toBe(1);
      expect(workWechatResult.results![0].openId).toBe('work_user_1');

      // 6. 验证两条消息历史都已保存
      expect(mockMessageService.saveMessage).toHaveBeenCalledTimes(2);
    });

    it('应该正确处理不存在的应用', async () => {
      mockAppService.getByKey.mockResolvedValue(null);

      const message: PushMessageInput = {
        title: '测试',
        desp: '内容',
      };

      const result = await pushService.push('non_existent_key', message);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('应该正确处理没有目标的应用', async () => {
      const channel: Channel = {
        id: 'ch_no_targets',
        name: '测试微信渠道',
        type: 'wechat',
        config: {
          appId: 'wx_test_appid',
          appSecret: 'wx_test_secret',
        } as WeChatConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const app: WeChatAppConfig = {
        id: 'app_no_targets',
        key: 'no_targets_key',
        name: '测试应用',
        channelId: channel.id,
        channelType: 'wechat',
        pushMode: PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAppService.getByKey.mockResolvedValue(app);
      mockChannelService.getById.mockResolvedValue(channel);
      mockOpenidService.getFirstOpenIdByApp.mockResolvedValue(null); // 没有 OpenID

      const message: PushMessageInput = {
        title: '测试',
        desp: '内容',
      };

      const result = await pushService.push(app.key, message);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});
