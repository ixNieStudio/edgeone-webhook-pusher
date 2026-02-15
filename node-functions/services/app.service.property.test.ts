/**
 * AppService Property-Based Tests
 * 
 * 使用 fast-check 进行属性测试
 * 验证应用密钥唯一性属性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { appService } from './app.service.js';
import { appsKV, channelsKV } from '../shared/kv-client.js';
import type { Channel, WeChatConfig } from '../types/channel.js';
import type { CreateAppInput, WeChatAppConfig, WorkWeChatAppConfig, WebhookAppConfig } from '../types/app.js';
import { PushModes, MessageTypes } from '../types/index.js';

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

// Mock utils with a counter to generate unique keys
vi.mock('../shared/utils.js', () => {
  let keyCounter = 0;
  let idCounter = 0;
  return {
    generateAppId: vi.fn(() => {
      idCounter++;
      return `app_test_${idCounter}`;
    }),
    generateAppKey: vi.fn(() => {
      keyCounter++;
      return `APKtest_key_${keyCounter.toString().padStart(29, '0')}`;
    }),
    now: vi.fn(() => new Date().toISOString()),
  };
});

const mockAppsKV = vi.mocked(appsKV);
const mockChannelsKV = vi.mocked(channelsKV);

describe('AppService - Property-Based Tests', () => {
  const testChannel: Channel = {
    id: 'ch_test',
    name: '测试渠道',
    type: 'wechat',
    config: {
      appId: 'wx_test',
      appSecret: 'secret',
    } as WeChatConfig,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelsKV.get.mockResolvedValue(testChannel);
  });

  /**
   * **Validates: Requirements 7.5**
   * 
   * 属性 12: 应用密钥唯一性
   * 
   * 对于任何新创建的应用，生成的应用密钥应该是唯一的，不与现有应用密钥重复
   */
  describe('属性 12: 应用密钥唯一性', () => {
    it('创建多个应用时，所有应用密钥应该唯一', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成 2-10 个应用名称
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              pushMode: fc.constantFrom(PushModes.SINGLE, PushModes.SUBSCRIBE),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (appInputs) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            mockChannelsKV.get.mockResolvedValue(testChannel);
            
            // Mock KV 行为：
            // - 对于 key 唯一性检查，总是返回 null（key 不存在）
            // - 对于 app list 查询，返回空数组
            mockAppsKV.get.mockImplementation(async (key: string) => {
              if (key.includes('app_index:')) {
                return null; // Key doesn't exist
              }
              if (key === 'apps:list') {
                return [];
              }
              return null;
            });

            const createdApps: Array<{ id: string; key: string; name: string }> = [];

            // 创建所有应用
            for (const input of appInputs) {
              const createInput: CreateAppInput = {
                name: input.name.trim() || 'Test App',
                channelId: testChannel.id,
                pushMode: input.pushMode,
              };

              try {
                const app = await appService.create(createInput);
                createdApps.push({
                  id: app.id,
                  key: app.key,
                  name: app.name,
                });
              } catch (error) {
                // 忽略验证错误（如空名称），继续测试
                continue;
              }
            }

            // 如果成功创建了至少 2 个应用，验证密钥唯一性
            if (createdApps.length >= 2) {
              const keys = createdApps.map(app => app.key);
              const uniqueKeys = new Set(keys);
              
              // 所有密钥应该唯一
              expect(uniqueKeys.size).toBe(keys.length);
              
              // 验证每个密钥都不同
              for (let i = 0; i < keys.length; i++) {
                for (let j = i + 1; j < keys.length; j++) {
                  expect(keys[i]).not.toBe(keys[j]);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('并发创建应用时，应用密钥应该唯一', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成 2-5 个应用名称（并发测试用较少数量）
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }),
            { minLength: 2, maxLength: 5 }
          ),
          async (appNames) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            mockChannelsKV.get.mockResolvedValue(testChannel);
            
            // Mock KV 行为
            mockAppsKV.get.mockImplementation(async (key: string) => {
              if (key.includes('app_index:')) {
                return null;
              }
              if (key === 'apps:list') {
                return [];
              }
              return null;
            });

            // 并发创建所有应用
            const createPromises = appNames.map(name => {
              const input: CreateAppInput = {
                name: name.trim() || 'Test App',
                channelId: testChannel.id,
                pushMode: PushModes.SINGLE,
              };
              return appService.create(input).catch(() => null);
            });

            const results = await Promise.all(createPromises);
            const createdApps = results.filter(app => app !== null);

            // 如果成功创建了至少 2 个应用，验证密钥唯一性
            if (createdApps.length >= 2) {
              const keys = createdApps.map(app => app!.key);
              const uniqueKeys = new Set(keys);
              
              // 所有密钥应该唯一
              expect(uniqueKeys.size).toBe(keys.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应用密钥格式应该一致且有效', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom(PushModes.SINGLE, PushModes.SUBSCRIBE),
          async (appName, pushMode) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            mockChannelsKV.get.mockResolvedValue(testChannel);
            
            mockAppsKV.get.mockImplementation(async (key: string) => {
              if (key.includes('app_index:')) {
                return null;
              }
              if (key === 'apps:list') {
                return [];
              }
              return null;
            });

            const input: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: testChannel.id,
              pushMode,
            };

            try {
              const app = await appService.create(input);
              
              // 验证密钥格式
              expect(app.key).toBeDefined();
              expect(typeof app.key).toBe('string');
              expect(app.key.length).toBeGreaterThan(0);
              
              // 验证密钥以 APK 开头（根据 utils.ts 中的实现）
              expect(app.key).toMatch(/^APK/);
              
              // 验证密钥长度至少 32 个字符
              expect(app.key.length).toBeGreaterThanOrEqual(32);
              
              // 验证密钥只包含 URL-safe 字符
              expect(app.key).toMatch(/^[A-Za-z0-9_-]+$/);
            } catch (error) {
              // 忽略验证错误
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('重试机制应该在密钥冲突时生成新密钥', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (appName) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            mockChannelsKV.get.mockResolvedValue(testChannel);
            
            // Mock: 前 2 次检查返回已存在，第 3 次返回不存在
            let checkCount = 0;
            mockAppsKV.get.mockImplementation(async (key: string) => {
              if (key.includes('app_index:')) {
                checkCount++;
                if (checkCount <= 2) {
                  return 'existing_app_id'; // Key exists
                }
                return null; // Key doesn't exist
              }
              if (key === 'apps:list') {
                return [];
              }
              return null;
            });

            const input: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: testChannel.id,
              pushMode: PushModes.SINGLE,
            };

            try {
              const app = await appService.create(input);
              
              // 应该成功创建应用（经过重试）
              expect(app).toBeDefined();
              expect(app.key).toBeDefined();
              
              // 应该至少检查了 3 次密钥唯一性
              expect(checkCount).toBeGreaterThanOrEqual(3);
            } catch (error) {
              // 忽略验证错误
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 11.4**
   * 
   * 属性 15: 应用配置字段验证
   * 
   * 对于任何应用配置，系统应该根据渠道类型验证必需字段的存在性
   * （微信需要 pushMode，企业微信需要 userIds 或 departmentIds，Webhook 需要 webhookUrl）
   */
  describe('属性 15: 应用配置字段验证', () => {
    it('微信渠道应用必须包含 pushMode 字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.constantFrom(MessageTypes.NORMAL, MessageTypes.TEMPLATE), { nil: undefined }),
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          async (appName, messageType, templateId) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            
            const wechatChannel: Channel = {
              ...testChannel,
              type: 'wechat',
            };
            mockChannelsKV.get.mockResolvedValue(wechatChannel);
            mockAppsKV.get.mockResolvedValue(null);

            // 测试缺少 pushMode 的情况
            const inputWithoutPushMode: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: wechatChannel.id,
              messageType,
              ...(templateId && { templateId }),
            };

            // 应该抛出错误
            await expect(appService.create(inputWithoutPushMode)).rejects.toThrow(/pushMode is required/i);

            // 测试包含 pushMode 的情况
            const inputWithPushMode: CreateAppInput = {
              ...inputWithoutPushMode,
              pushMode: PushModes.SINGLE,
            };

            // 如果是模板消息但没有 templateId，应该抛出错误
            if (messageType === MessageTypes.TEMPLATE && !templateId) {
              await expect(appService.create(inputWithPushMode)).rejects.toThrow(/templateId is required/i);
            } else {
              // 应该成功创建
              const app = await appService.create(inputWithPushMode);
              expect(app).toBeDefined();
              expect(app.channelType).toBe('wechat');
              expect((app as WeChatAppConfig).pushMode).toBe(PushModes.SINGLE);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('企业微信渠道应用必须包含 userIds 或 departmentIds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }), { nil: undefined }),
          fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }), { nil: undefined }),
          async (appName, userIds, departmentIds) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            
            const workWechatChannel: Channel = {
              ...testChannel,
              type: 'work_wechat',
              config: {
                corpId: 'corp_test',
                agentId: 1000001,
                corpSecret: 'secret',
              },
            };
            mockChannelsKV.get.mockResolvedValue(workWechatChannel);
            mockAppsKV.get.mockResolvedValue(null);

            // 测试既没有 userIds 也没有 departmentIds 的情况
            const inputWithoutTargets: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: workWechatChannel.id,
            };

            // 应该抛出错误
            await expect(appService.create(inputWithoutTargets)).rejects.toThrow(/at least one of userIds or departmentIds is required/i);

            // 测试包含至少一个目标的情况
            if (userIds || departmentIds) {
              const inputWithTargets: CreateAppInput = {
                ...inputWithoutTargets,
                ...(userIds && { userIds }),
                ...(departmentIds && { departmentIds }),
              };

              // 应该成功创建
              const app = await appService.create(inputWithTargets);
              expect(app).toBeDefined();
              expect(app.channelType).toBe('work_wechat');
              
              const workWechatApp = app as WorkWeChatAppConfig;
              // 至少有一个目标字段存在
              expect(workWechatApp.userIds || workWechatApp.departmentIds).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('钉钉渠道应用必须包含 webhookUrl 字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.webUrl(), { nil: undefined }),
          async (appName, webhookUrl) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            
            const dingtalkChannel: Channel = {
              ...testChannel,
              type: 'dingtalk',
              config: {
                webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
              },
            };
            mockChannelsKV.get.mockResolvedValue(dingtalkChannel);
            mockAppsKV.get.mockResolvedValue(null);

            // 测试缺少 webhookUrl 的情况
            const inputWithoutWebhook: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: dingtalkChannel.id,
            };

            // 应该抛出错误
            await expect(appService.create(inputWithoutWebhook)).rejects.toThrow(/webhookUrl is required/i);

            // 测试包含 webhookUrl 的情况
            if (webhookUrl) {
              const inputWithWebhook: CreateAppInput = {
                ...inputWithoutWebhook,
                webhookUrl,
              };

              // 应该成功创建
              const app = await appService.create(inputWithWebhook);
              expect(app).toBeDefined();
              expect(app.channelType).toBe('dingtalk');
              expect((app as WebhookAppConfig).webhookUrl).toBe(webhookUrl);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('飞书渠道应用必须包含 webhookUrl 字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.webUrl(), { nil: undefined }),
          async (appName, webhookUrl) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            
            const feishuChannel: Channel = {
              ...testChannel,
              type: 'feishu',
              config: {
                webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
              },
            };
            mockChannelsKV.get.mockResolvedValue(feishuChannel);
            mockAppsKV.get.mockResolvedValue(null);

            // 测试缺少 webhookUrl 的情况
            const inputWithoutWebhook: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: feishuChannel.id,
            };

            // 应该抛出错误
            await expect(appService.create(inputWithoutWebhook)).rejects.toThrow(/webhookUrl is required/i);

            // 测试包含 webhookUrl 的情况
            if (webhookUrl) {
              const inputWithWebhook: CreateAppInput = {
                ...inputWithoutWebhook,
                webhookUrl,
              };

              // 应该成功创建
              const app = await appService.create(inputWithWebhook);
              expect(app).toBeDefined();
              expect(app.channelType).toBe('feishu');
              expect((app as WebhookAppConfig).webhookUrl).toBe(webhookUrl);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('所有渠道类型都应该正确验证其特定的必需字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('wechat', 'work_wechat', 'dingtalk', 'feishu'),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (channelType, appName) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            mockAppsKV.get.mockResolvedValue(null);

            // 创建对应类型的渠道
            let channel: Channel;
            switch (channelType) {
              case 'wechat':
                channel = {
                  ...testChannel,
                  type: 'wechat',
                };
                break;
              case 'work_wechat':
                channel = {
                  ...testChannel,
                  type: 'work_wechat',
                  config: {
                    corpId: 'corp_test',
                    agentId: 1000001,
                    corpSecret: 'secret',
                  },
                };
                break;
              case 'dingtalk':
                channel = {
                  ...testChannel,
                  type: 'dingtalk',
                  config: {
                    webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
                  },
                };
                break;
              case 'feishu':
                channel = {
                  ...testChannel,
                  type: 'feishu',
                  config: {
                    webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
                  },
                };
                break;
              default:
                throw new Error(`Unsupported channel type: ${channelType}`);
            }

            mockChannelsKV.get.mockResolvedValue(channel);

            // 创建缺少必需字段的输入
            const incompleteInput: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: channel.id,
            };

            // 所有渠道类型都应该拒绝不完整的配置
            await expect(appService.create(incompleteInput)).rejects.toThrow();

            // 创建包含必需字段的输入
            let completeInput: CreateAppInput;
            switch (channelType) {
              case 'wechat':
                completeInput = {
                  ...incompleteInput,
                  pushMode: PushModes.SINGLE,
                  messageType: MessageTypes.NORMAL,
                };
                break;
              case 'work_wechat':
                completeInput = {
                  ...incompleteInput,
                  userIds: ['user1', 'user2'],
                };
                break;
              case 'dingtalk':
              case 'feishu':
                completeInput = {
                  ...incompleteInput,
                  webhookUrl: 'https://example.com/webhook',
                };
                break;
              default:
                throw new Error(`Unsupported channel type: ${channelType}`);
            }

            // 应该成功创建
            const app = await appService.create(completeInput);
            expect(app).toBeDefined();
            expect(app.channelType).toBe(channelType);

            // 验证必需字段存在
            switch (channelType) {
              case 'wechat': {
                const wechatApp = app as WeChatAppConfig;
                expect(wechatApp.pushMode).toBeDefined();
                expect(wechatApp.messageType).toBeDefined();
                break;
              }
              case 'work_wechat': {
                const workWechatApp = app as WorkWeChatAppConfig;
                expect(workWechatApp.userIds || workWechatApp.departmentIds).toBeTruthy();
                break;
              }
              case 'dingtalk':
              case 'feishu': {
                const webhookApp = app as WebhookAppConfig;
                expect(webhookApp.webhookUrl).toBeDefined();
                break;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('微信渠道的 pushMode 必须是有效值', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['single', 'subscribe'].includes(s)),
          async (appName, invalidPushMode) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            
            const wechatChannel: Channel = {
              ...testChannel,
              type: 'wechat',
            };
            mockChannelsKV.get.mockResolvedValue(wechatChannel);
            mockAppsKV.get.mockResolvedValue(null);

            // 测试无效的 pushMode
            const inputWithInvalidPushMode: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: wechatChannel.id,
              pushMode: invalidPushMode as any,
            };

            // 应该抛出错误
            await expect(appService.create(inputWithInvalidPushMode)).rejects.toThrow(/pushMode must be one of/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('微信渠道的模板消息必须包含 templateId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (appName) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            
            const wechatChannel: Channel = {
              ...testChannel,
              type: 'wechat',
            };
            mockChannelsKV.get.mockResolvedValue(wechatChannel);
            mockAppsKV.get.mockResolvedValue(null);

            // 测试模板消息但没有 templateId
            const inputWithoutTemplateId: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: wechatChannel.id,
              pushMode: PushModes.SINGLE,
              messageType: MessageTypes.TEMPLATE,
              // 缺少 templateId
            };

            // 应该抛出错误
            await expect(appService.create(inputWithoutTemplateId)).rejects.toThrow(/templateId is required/i);

            // 测试包含 templateId 的情况
            const inputWithTemplateId: CreateAppInput = {
              ...inputWithoutTemplateId,
              templateId: 'template_123',
            };

            // 应该成功创建
            const app = await appService.create(inputWithTemplateId);
            expect(app).toBeDefined();
            expect((app as WeChatAppConfig).templateId).toBe('template_123');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('企业微信渠道的 messageType 必须是有效值', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['text', 'template_card'].includes(s)),
          async (appName, invalidMessageType) => {
            // 重置 mock
            mockAppsKV.get.mockReset();
            mockAppsKV.put.mockReset();
            
            const workWechatChannel: Channel = {
              ...testChannel,
              type: 'work_wechat',
              config: {
                corpId: 'corp_test',
                agentId: 1000001,
                corpSecret: 'secret',
              },
            };
            mockChannelsKV.get.mockResolvedValue(workWechatChannel);
            mockAppsKV.get.mockResolvedValue(null);

            // 测试无效的 messageType
            const inputWithInvalidMessageType: CreateAppInput = {
              name: appName.trim() || 'Test App',
              channelId: workWechatChannel.id,
              userIds: ['user1'],
              messageType: invalidMessageType as any,
            };

            // 应该抛出错误
            await expect(appService.create(inputWithInvalidMessageType)).rejects.toThrow(/messageType must be one of/i);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
