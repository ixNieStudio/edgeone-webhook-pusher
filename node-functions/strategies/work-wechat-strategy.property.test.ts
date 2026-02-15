/**
 * WorkWeChatStrategy 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证系统在各种输入下的通用属性
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { WorkWeChatStrategy } from './work-wechat-strategy.js';
import type { Channel, WorkWeChatConfig } from '../types/channel.js';
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

describe('WorkWeChatStrategy - Property-Based Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * 属性 5: 配置验证完整性
   * **Validates: Requirements 4.1, 4.2**
   * 
   * 对于任何渠道配置，如果缺少必需字段（corpId、agentId、corpSecret），
   * 系统应该拒绝配置并返回明确的错误信息
   */
  describe('Feature: arch-redisign, Property 5: 配置验证完整性', () => {
    it('应该在缺少 corpId 时抛出明确的错误', () => {
      fc.assert(
        fc.property(
          // 生成随机的配置（缺少 corpId）
          fc.record({
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          (config) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as any,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            expect(() => new WorkWeChatStrategy(channel)).toThrow('Missing required config: corpId');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该在缺少 agentId 时抛出明确的错误', () => {
      fc.assert(
        fc.property(
          // 生成随机的配置（缺少 agentId）
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          (config) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as any,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            expect(() => new WorkWeChatStrategy(channel)).toThrow('Missing required config: agentId');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该在缺少 corpSecret 时抛出明确的错误', () => {
      fc.assert(
        fc.property(
          // 生成随机的配置（缺少 corpSecret）
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
          }),
          (config) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as any,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            expect(() => new WorkWeChatStrategy(channel)).toThrow('Missing required config: corpSecret');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该在所有必需字段存在时成功创建', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          (config) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            expect(() => new WorkWeChatStrategy(channel)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 7: 消息格式正确性
   * **Validates: Requirements 9.1, 9.2**
   * 
   * 对于任何渠道策略和消息内容，构建的消息体应该符合该渠道的 API 格式规范
   * （包含必需字段、正确的数据类型）
   */
  describe('Feature: arch-redisign, Property 7: 消息格式正确性', () => {
    it('应该为用户ID构建符合规范的消息体', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的消息
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            desp: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          }),
          // 生成随机的用户ID（不以 dept_ 开头）
          fc.string({ minLength: 5, maxLength: 30 }).filter(s => !s.startsWith('dept_')),
          (config, message, userId) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WorkWeChatStrategy(channel);
            const messageBody = (strategy as any).buildMessage(message, userId);

            // 验证：必需字段存在
            expect(messageBody).toHaveProperty('touser');
            expect(messageBody).toHaveProperty('msgtype');
            expect(messageBody).toHaveProperty('agentid');
            expect(messageBody).toHaveProperty('text');

            // 验证：字段类型正确
            expect(typeof messageBody.touser).toBe('string');
            expect(messageBody.touser).toBe(userId);
            expect(messageBody.msgtype).toBe('text');
            expect(typeof messageBody.agentid).toBe('number');
            expect(messageBody.agentid).toBe(config.agentId);
            expect(typeof messageBody.text).toBe('object');
            expect(typeof messageBody.text.content).toBe('string');

            // 验证：部门字段应该是 undefined
            expect(messageBody.toparty).toBeUndefined();

            // 验证：消息内容不为空
            expect(messageBody.text.content.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该为部门ID构建符合规范的消息体', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成随机的消息
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            desp: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          }),
          // 生成随机的部门ID（以 dept_ 开头）
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `dept_${s}`),
          (config, message, deptId) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WorkWeChatStrategy(channel);
            const messageBody = (strategy as any).buildMessage(message, deptId);

            // 验证：必需字段存在
            expect(messageBody).toHaveProperty('toparty');
            expect(messageBody).toHaveProperty('msgtype');
            expect(messageBody).toHaveProperty('agentid');
            expect(messageBody).toHaveProperty('text');

            // 验证：字段类型正确
            expect(typeof messageBody.toparty).toBe('string');
            expect(messageBody.toparty).toBe(deptId.replace('dept_', ''));
            expect(messageBody.msgtype).toBe('text');
            expect(typeof messageBody.agentid).toBe('number');
            expect(messageBody.agentid).toBe(config.agentId);

            // 验证：用户字段应该是 undefined
            expect(messageBody.touser).toBeUndefined();

            // 验证：消息内容不为空
            expect(messageBody.text.content.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 8: 特殊字符转义
   * **Validates: Requirements 9.3**
   * 
   * 对于任何包含特殊字符（<, >, &, ", '）的消息内容，
   * 系统应该正确转义这些字符
   */
  describe('Feature: arch-redisign, Property 8: 特殊字符转义', () => {
    it('应该转义所有特殊字符', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成包含特殊字符的消息
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            desp: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          fc.string({ minLength: 5, maxLength: 30 }),
          (config, message, target) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WorkWeChatStrategy(channel);

            // 在消息中插入特殊字符
            const messageWithSpecialChars: PushMessage = {
              title: `${message.title}<test>&"'`,
              desp: message.desp ? `${message.desp}<>&"'` : undefined,
            };

            const messageBody = (strategy as any).buildMessage(messageWithSpecialChars, target);

            // 验证：特殊字符被转义
            expect(messageBody.text.content).not.toContain('<test>');
            expect(messageBody.text.content).toContain('&lt;test&gt;');
            expect(messageBody.text.content).toContain('&amp;');
            expect(messageBody.text.content).toContain('&quot;');
            expect(messageBody.text.content).toContain('&#39;');

            // 验证：不包含未转义的特殊字符（除了换行符）
            const contentWithoutNewlines = messageBody.text.content.replace(/\n/g, '');
            expect(contentWithoutNewlines).not.toMatch(/[<>"'](?!;)/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该正确转义多个连续的特殊字符', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          fc.string({ minLength: 5, maxLength: 30 }),
          (config, target) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WorkWeChatStrategy(channel);

            // 创建包含多个连续特殊字符的消息
            const message: PushMessage = {
              title: '<<>>&&&"""\'\'\'',
            };

            const messageBody = (strategy as any).buildMessage(message, target);

            // 验证：所有特殊字符都被转义
            expect(messageBody.text.content).toBe(
              '&lt;&lt;&gt;&gt;&amp;&amp;&amp;&quot;&quot;&quot;&#39;&#39;&#39;'
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 9: 消息长度限制
   * **Validates: Requirements 9.4**
   * 
   * 对于任何超过最大长度限制的消息内容，
   * 系统应该自动截断并添加省略标记
   */
  describe('Feature: arch-redisign, Property 9: 消息长度限制', () => {
    it('应该截断超长消息并添加省略标记', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成超长消息（2049-5000 字符）
          fc.integer({ min: 2049, max: 5000 }),
          fc.string({ minLength: 5, maxLength: 30 }),
          (config, length, target) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WorkWeChatStrategy(channel);

            // 创建超长消息
            const longText = 'a'.repeat(length);
            const message: PushMessage = {
              title: longText,
            };

            const messageBody = (strategy as any).buildMessage(message, target);

            // 验证：消息被截断到 2048 字符
            expect(messageBody.text.content.length).toBe(2048);

            // 验证：以省略标记结尾
            expect(messageBody.text.content).toMatch(/\.\.\.$/);

            // 验证：截断前的内容是原始内容的前缀
            expect(messageBody.text.content.startsWith('aaa')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该不截断未超长的消息', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          // 生成未超长消息（1-2048 字符）
          fc.integer({ min: 1, max: 2048 }),
          fc.string({ minLength: 5, maxLength: 30 }),
          (config, length, target) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WorkWeChatStrategy(channel);

            // 创建未超长消息
            const text = 'a'.repeat(length);
            const message: PushMessage = {
              title: text,
            };

            const messageBody = (strategy as any).buildMessage(message, target);

            // 验证：消息长度等于原始长度
            expect(messageBody.text.content.length).toBe(length);

            // 验证：内容完全相同
            expect(messageBody.text.content).toBe(text);

            // 验证：不以省略标记结尾
            expect(messageBody.text.content).not.toMatch(/\.\.\.$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该在转义后截断消息', () => {
      fc.assert(
        fc.property(
          // 生成随机的完整配置
          fc.record({
            corpId: fc.string({ minLength: 10, maxLength: 20 }),
            agentId: fc.integer({ min: 1000000, max: 9999999 }),
            corpSecret: fc.string({ minLength: 20, maxLength: 40 }),
          }),
          fc.string({ minLength: 5, maxLength: 30 }),
          (config, target) => {
            const channel: Channel = {
              id: 'test-channel',
              name: 'Test Channel',
              type: 'work_wechat',
              config: config as WorkWeChatConfig,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            };

            const strategy = new WorkWeChatStrategy(channel);

            // 创建包含特殊字符的超长消息
            // '<test>' 会被转义为 '&lt;test&gt;' (13 字符)
            // 重复 500 次 = 6500 字符（转义后）
            const text = '<test>'.repeat(500);
            const message: PushMessage = {
              title: text,
            };

            const messageBody = (strategy as any).buildMessage(message, target);

            // 验证：消息被截断到 2048 字符
            expect(messageBody.text.content.length).toBe(2048);

            // 验证：包含转义后的字符
            expect(messageBody.text.content).toContain('&lt;test&gt;');

            // 验证：以省略标记结尾
            expect(messageBody.text.content).toMatch(/\.\.\.$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
