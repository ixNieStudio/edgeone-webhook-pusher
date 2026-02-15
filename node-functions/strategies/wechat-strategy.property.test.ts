/**
 * WeChatStrategy 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证系统在各种输入下的通用属性
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { WeChatStrategy } from './wechat-strategy.js';
import type { Channel } from '../types/channel.js';
import type { PushMessage } from './types.js';
import * as kvClient from '../shared/kv-client.js';

// Mock KV client
vi.mock('../shared/kv-client.js', () => ({
  configKV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('WeChatStrategy - Property-Based Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * 属性 2: Token 获取和缓存
   * **Validates: Requirements 3.2**
   * 
   * 对于任何渠道策略，当多次请求 access token 时，
   * 如果 token 未过期，应该返回缓存的 token 而不是重新请求
   */
  describe('Feature: arch-redisign, Property 2: Token 获取和缓存', () => {
    it('应该在 token 未过期时返回缓存的 token', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的渠道配置
          fc.record({
            appId: fc.string({ minLength: 10, maxLength: 20 }),
            appSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的 token 和过期时间（未来时间）
          fc.record({
            token: fc.string({ minLength: 100, maxLength: 200 }),
            expiresIn: fc.integer({ min: 3600, max: 7200 }), // 1-2 hours
          }),
          async (config, tokenData) => {
            // 重置 mocks（每次迭代都重置）
            vi.clearAllMocks();

            // 创建渠道和策略
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'wechat',
              config,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WeChatStrategy(channel);

            // 设置缓存的 token（未过期）
            const cachedToken = {
              accessToken: tokenData.token,
              expiresAt: Date.now() + tokenData.expiresIn * 1000,
            };

            vi.mocked(kvClient.configKV.get).mockResolvedValue(cachedToken);

            // Mock fetch（不应该被调用）
            const fetchMock = vi.fn();
            global.fetch = fetchMock;

            // 第一次获取 token
            const token1 = await (strategy as any).getAccessToken();

            // 第二次获取 token
            const token2 = await (strategy as any).getAccessToken();

            // 验证：两次返回相同的 token
            expect(token1).toBe(tokenData.token);
            expect(token2).toBe(tokenData.token);

            // 验证：fetch 没有被调用（使用了缓存）
            expect(fetchMock).not.toHaveBeenCalled();

            // 验证：从缓存读取了两次
            expect(kvClient.configKV.get).toHaveBeenCalledTimes(2);
            expect(kvClient.configKV.get).toHaveBeenCalledWith(`wechat_token:${config.appId}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该在 token 过期时重新请求新 token', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的渠道配置
          fc.record({
            appId: fc.string({ minLength: 10, maxLength: 20 }),
            appSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的旧 token 和新 token
          fc.record({
            oldToken: fc.string({ minLength: 100, maxLength: 200 }),
            newToken: fc.string({ minLength: 100, maxLength: 200 }),
            expiresIn: fc.integer({ min: 3600, max: 7200 }),
          }),
          async (config, tokenData) => {
            // 重置 mocks（每次迭代都重置）
            vi.clearAllMocks();

            // 创建渠道和策略
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'wechat',
              config,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WeChatStrategy(channel);

            // 设置过期的 token
            const expiredToken = {
              accessToken: tokenData.oldToken,
              expiresAt: Date.now() - 1000, // 已过期
            };

            vi.mocked(kvClient.configKV.get).mockResolvedValue(expiredToken);

            // Mock fetch 返回新 token
            global.fetch = vi.fn().mockResolvedValue({
              json: async () => ({
                access_token: tokenData.newToken,
                expires_in: tokenData.expiresIn,
              }),
            });

            // 获取 token
            const token = await (strategy as any).getAccessToken();

            // 验证：返回新 token
            expect(token).toBe(tokenData.newToken);

            // 验证：调用了 API 获取新 token
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('https://api.weixin.qq.com/cgi-bin/token')
            );

            // 验证：新 token 被缓存
            expect(kvClient.configKV.put).toHaveBeenCalledWith(
              `wechat_token:${config.appId}`,
              expect.objectContaining({
                accessToken: tokenData.newToken,
              }),
              7000
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 3: Token 失效自动重试
   * **Validates: Requirements 5.2**
   * 
   * 对于任何渠道策略，当 API 返回 token 失效错误（40001, 42001）时，
   * 系统应该自动刷新 token 并重试一次
   */
  describe('Feature: arch-redisign, Property 3: Token 失效自动重试', () => {
    it('应该在收到 token 失效错误时自动重试', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的渠道配置
          fc.record({
            appId: fc.string({ minLength: 10, maxLength: 20 }),
            appSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的消息和目标
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            desp: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          }),
          fc.string({ minLength: 10, maxLength: 30 }), // openId
          // 生成 token 失效错误码（40001 或 42001）
          fc.constantFrom(40001, 42001),
          // 生成随机的 token
          fc.record({
            oldToken: fc.string({ minLength: 100, maxLength: 200 }),
            newToken: fc.string({ minLength: 100, maxLength: 200 }),
          }),
          async (config, message, openId, errorCode, tokens) => {
            // 重置 mocks（每次迭代都重置）
            vi.clearAllMocks();

            // 创建渠道和策略
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'wechat',
              config,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WeChatStrategy(channel);

            // 构建消息体
            const messageBody = {
              touser: openId,
              msgtype: 'text',
              text: { content: message.desp ? `${message.title}\n\n${message.desp}` : message.title },
            };

            // Mock fetch：第一次返回 token 失效错误，第二次返回新 token，第三次成功
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // 第一次调用：返回 token 失效错误
                return Promise.resolve({
                  json: async () => ({
                    errcode: errorCode,
                    errmsg: errorCode === 40001 ? 'invalid credential' : 'access_token expired',
                  }),
                });
              } else if (callCount === 2) {
                // 第二次调用：返回新 token
                return Promise.resolve({
                  json: async () => ({
                    access_token: tokens.newToken,
                    expires_in: 7200,
                  }),
                });
              } else {
                // 第三次调用：发送成功
                return Promise.resolve({
                  json: async () => ({
                    errcode: 0,
                    errmsg: 'ok',
                    msgid: 123456,
                  }),
                });
              }
            });

            vi.mocked(kvClient.configKV.get).mockResolvedValue(null);

            // 发送请求
            const result = await (strategy as any).sendRequest(tokens.oldToken, messageBody);

            // 验证：最终成功
            expect(result.success).toBe(true);

            // 验证：调用了 3 次 fetch（原始请求 + 获取新 token + 重试请求）
            expect(global.fetch).toHaveBeenCalledTimes(3);

            // 验证：清除了旧的缓存
            expect(kvClient.configKV.delete).toHaveBeenCalledWith(`wechat_token:${config.appId}`);

            // 验证：缓存了新 token
            expect(kvClient.configKV.put).toHaveBeenCalledWith(
              `wechat_token:${config.appId}`,
              expect.objectContaining({
                accessToken: tokens.newToken,
              }),
              7000
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该在非 token 错误时不重试', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的渠道配置
          fc.record({
            appId: fc.string({ minLength: 10, maxLength: 20 }),
            appSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的消息
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          fc.string({ minLength: 10, maxLength: 30 }), // openId
          // 生成非 token 错误码
          fc.integer({ min: 40002, max: 50000 }).filter(code => code !== 40001 && code !== 42001),
          fc.string({ minLength: 100, maxLength: 200 }), // token
          async (config, message, openId, errorCode, token) => {
            // 重置 mocks（每次迭代都重置）
            vi.clearAllMocks();

            // 创建渠道和策略
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'wechat',
              config,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WeChatStrategy(channel);

            // 构建消息体
            const messageBody = {
              touser: openId,
              msgtype: 'text',
              text: { content: message.title },
            };

            // Mock fetch：返回非 token 错误
            global.fetch = vi.fn().mockResolvedValue({
              json: async () => ({
                errcode: errorCode,
                errmsg: 'some error',
              }),
            });

            // 发送请求
            const result = await (strategy as any).sendRequest(token, messageBody);

            // 验证：失败
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe(errorCode);

            // 验证：只调用了 1 次 fetch（没有重试）
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // 验证：没有删除缓存
            expect(kvClient.configKV.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 4: 消息发送到正确目标
   * **Validates: Requirements 3.3**
   * 
   * 对于任何渠道策略和目标列表，发送消息后返回的结果数量应该等于目标数量，
   * 且每个结果应该对应一个目标
   */
  describe('Feature: arch-redisign, Property 4: 消息发送到正确目标', () => {
    it('应该为每个目标返回一个结果', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的渠道配置
          fc.record({
            appId: fc.string({ minLength: 10, maxLength: 20 }),
            appSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的消息
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            desp: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          }),
          // 生成随机的目标列表（1-10 个目标）
          fc.array(fc.string({ minLength: 10, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
          async (config, message, targets) => {
            // 重置 mocks（每次迭代都重置）
            vi.clearAllMocks();

            // 创建渠道和策略
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'wechat',
              config,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WeChatStrategy(channel);

            // Mock 缓存的 token
            vi.mocked(kvClient.configKV.get).mockResolvedValue({
              accessToken: 'valid-token',
              expiresAt: Date.now() + 3600000,
            });

            // Mock fetch：所有请求都成功
            global.fetch = vi.fn().mockResolvedValue({
              json: async () => ({
                errcode: 0,
                errmsg: 'ok',
                msgid: 123456,
              }),
            });

            // 发送消息
            const result = await strategy.send(message, targets);

            // 验证：结果总数等于目标数量
            expect(result.total).toBe(targets.length);

            // 验证：返回的结果数量等于目标数量
            expect(result.results).toHaveLength(targets.length);

            // 验证：成功数 + 失败数 = 总数
            expect(result.success + result.failed).toBe(targets.length);

            // 验证：每个目标都有对应的结果
            const resultOpenIds = result.results.map(r => r.openId);
            expect(resultOpenIds).toEqual(targets);

            // 验证：每个结果都有 success 字段
            result.results.forEach(r => {
              expect(r).toHaveProperty('success');
              expect(typeof r.success).toBe('boolean');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该正确统计成功和失败数量', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的渠道配置
          fc.record({
            appId: fc.string({ minLength: 10, maxLength: 20 }),
            appSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的消息
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          // 生成随机的目标列表（2-10 个目标）
          fc.array(fc.string({ minLength: 10, maxLength: 30 }), { minLength: 2, maxLength: 10 }),
          // 生成随机的失败索引（哪些目标会失败）
          fc.array(fc.integer({ min: 0, max: 9 }), { maxLength: 5 }),
          async (config, message, targets, failureIndices) => {
            // 重置 mocks（每次迭代都重置）
            vi.clearAllMocks();

            // 创建渠道和策略
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'wechat',
              config,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WeChatStrategy(channel);

            // Mock 缓存的 token
            vi.mocked(kvClient.configKV.get).mockResolvedValue({
              accessToken: 'valid-token',
              expiresAt: Date.now() + 3600000,
            });

            // 计算实际会失败的目标数量
            const actualFailureIndices = failureIndices.filter(idx => idx < targets.length);
            const expectedFailures = new Set(actualFailureIndices).size;
            const expectedSuccesses = targets.length - expectedFailures;

            // Mock fetch：根据索引决定成功或失败
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
              const currentIndex = callCount;
              callCount++;

              if (actualFailureIndices.includes(currentIndex)) {
                // 失败
                return Promise.resolve({
                  json: async () => ({
                    errcode: 45015,
                    errmsg: 'user not followed',
                  }),
                });
              } else {
                // 成功
                return Promise.resolve({
                  json: async () => ({
                    errcode: 0,
                    errmsg: 'ok',
                    msgid: 123456,
                  }),
                });
              }
            });

            // 发送消息
            const result = await strategy.send(message, targets);

            // 验证：总数正确
            expect(result.total).toBe(targets.length);

            // 验证：成功数 + 失败数 = 总数
            expect(result.success + result.failed).toBe(targets.length);

            // 验证：成功数和失败数正确
            expect(result.success).toBe(expectedSuccesses);
            expect(result.failed).toBe(expectedFailures);

            // 验证：结果中的成功/失败状态与统计一致
            const actualSuccesses = result.results.filter(r => r.success).length;
            const actualFailures = result.results.filter(r => !r.success).length;
            expect(actualSuccesses).toBe(result.success);
            expect(actualFailures).toBe(result.failed);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该处理空目标列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的渠道配置
          fc.record({
            appId: fc.string({ minLength: 10, maxLength: 20 }),
            appSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的消息
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (config, message) => {
            // 重置 mocks（每次迭代都重置）
            vi.clearAllMocks();

            // 创建渠道和策略
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'wechat',
              config,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WeChatStrategy(channel);

            // 发送消息到空目标列表
            const result = await strategy.send(message, []);

            // 验证：所有计数都是 0
            expect(result.total).toBe(0);
            expect(result.success).toBe(0);
            expect(result.failed).toBe(0);
            expect(result.results).toHaveLength(0);

            // 验证：有 pushId
            expect(result.pushId).toBeDefined();
            expect(typeof result.pushId).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
