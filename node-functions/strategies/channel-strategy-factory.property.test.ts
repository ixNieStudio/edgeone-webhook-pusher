/**
 * ChannelStrategyFactory 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ChannelStrategyFactory } from './channel-strategy-factory.js';
import { WeChatStrategy } from './wechat-strategy.js';
import { WorkWeChatStrategy } from './work-wechat-strategy.js';
import { DingTalkStrategy } from './dingtalk-strategy.js';
import { FeishuStrategy } from './feishu-strategy.js';
import { BaseChannelStrategy } from './base-channel-strategy.js';
import type { Channel, ChannelType } from '../types/channel.js';

describe('ChannelStrategyFactory Property Tests', () => {
  const factory = new ChannelStrategyFactory();

  /**
   * 属性 1: 策略工厂正确性
   * Feature: arch-redisign, Property 1: 策略工厂正确性
   * 
   * 对于任何有效的渠道类型（wechat、work_wechat、dingtalk、feishu），
   * 工厂应该返回对应类型的策略实例，且该实例应该继承自 BaseChannelStrategy
   * 
   * **验证需求: 1.3**
   */
  describe('Property 1: 策略工厂正确性', () => {
    // 生成有效的渠道类型
    const validChannelType = fc.constantFrom<ChannelType>(
      'wechat',
      'work_wechat',
      'dingtalk',
      'feishu'
    );

    // 生成微信配置
    const wechatConfig = fc.record({
      appId: fc.string({ minLength: 1 }),
      appSecret: fc.string({ minLength: 1 }),
      msgToken: fc.option(fc.string()),
    });

    // 生成企业微信配置
    const workWechatConfig = fc.record({
      corpId: fc.string({ minLength: 1 }),
      agentId: fc.integer({ min: 1 }),
      corpSecret: fc.string({ minLength: 1 }),
    });

    // 生成 Webhook 配置
    const webhookConfig = fc.record({
      webhookUrl: fc.webUrl(),
      secret: fc.option(fc.string()),
    });

    // 根据渠道类型生成对应的配置
    const channelConfigForType = (type: ChannelType) => {
      switch (type) {
        case 'wechat':
          return wechatConfig;
        case 'work_wechat':
          return workWechatConfig;
        case 'dingtalk':
        case 'feishu':
          return webhookConfig;
      }
    };

    // 生成完整的渠道对象
    const channelArbitrary = validChannelType.chain(type =>
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1 }),
        type: fc.constant(type),
        config: channelConfigForType(type),
        createdAt: fc.constant(new Date().toISOString()),
        updatedAt: fc.constant(new Date().toISOString()),
      })
    );

    it('应该为任何有效渠道类型创建正确的策略实例', () => {
      fc.assert(
        fc.property(channelArbitrary, (channel) => {
          const strategy = factory.createStrategy(channel as Channel);

          // 验证策略继承自 BaseChannelStrategy
          expect(strategy).toBeInstanceOf(BaseChannelStrategy);

          // 验证策略类型正确
          switch (channel.type) {
            case 'wechat':
              expect(strategy).toBeInstanceOf(WeChatStrategy);
              break;
            case 'work_wechat':
              expect(strategy).toBeInstanceOf(WorkWeChatStrategy);
              break;
            case 'dingtalk':
              expect(strategy).toBeInstanceOf(DingTalkStrategy);
              break;
            case 'feishu':
              expect(strategy).toBeInstanceOf(FeishuStrategy);
              break;
          }
        }),
        { numRuns: 100 }
      );
    });

    it('应该为相同渠道类型创建相同类型的策略', () => {
      fc.assert(
        fc.property(
          validChannelType,
          fc.uuid(),
          fc.string({ minLength: 1 }),
          (type, id, name) => {
            // 创建两个相同类型但不同配置的渠道
            const channel1: Channel = {
              id: id + '-1',
              name: name + '-1',
              type,
              config: type === 'wechat'
                ? { appId: 'app1', appSecret: 'secret1' }
                : type === 'work_wechat'
                ? { corpId: 'corp1', agentId: 1, corpSecret: 'secret1' }
                : { webhookUrl: 'https://example.com/1' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const channel2: Channel = {
              id: id + '-2',
              name: name + '-2',
              type,
              config: type === 'wechat'
                ? { appId: 'app2', appSecret: 'secret2' }
                : type === 'work_wechat'
                ? { corpId: 'corp2', agentId: 2, corpSecret: 'secret2' }
                : { webhookUrl: 'https://example.com/2' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const strategy1 = factory.createStrategy(channel1);
            const strategy2 = factory.createStrategy(channel2);

            // 验证两个策略是相同类型的实例
            expect(strategy1.constructor).toBe(strategy2.constructor);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该为 Token 管理型渠道返回正确的能力类型', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ChannelType>('wechat', 'work_wechat'),
          (type) => {
            const channel: Channel = {
              id: 'test-id',
              name: 'Test Channel',
              type,
              config: type === 'wechat'
                ? { appId: 'test', appSecret: 'test' }
                : { corpId: 'test', agentId: 1, corpSecret: 'test' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const strategy = factory.createStrategy(channel);
            const capability = strategy.getChannelCapability();

            expect(capability).toBe('token_managed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该为 Webhook 型渠道返回正确的能力类型', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ChannelType>('dingtalk', 'feishu'),
          (type) => {
            const channel: Channel = {
              id: 'test-id',
              name: 'Test Channel',
              type,
              config: { webhookUrl: 'https://example.com/webhook' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const strategy = factory.createStrategy(channel);
            const capability = strategy.getChannelCapability();

            expect(capability).toBe('webhook');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应该为无效渠道类型抛出错误', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['wechat', 'work_wechat', 'dingtalk', 'feishu'].includes(s)),
          fc.uuid(),
          (invalidType, id) => {
            const channel: Channel = {
              id,
              name: 'Invalid Channel',
              type: invalidType as any,
              config: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            expect(() => factory.createStrategy(channel)).toThrow(/Unsupported channel type/);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
