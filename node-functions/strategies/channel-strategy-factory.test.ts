/**
 * ChannelStrategyFactory 单元测试
 * 
 * 测试策略工厂的正确性
 */

import { describe, it, expect } from 'vitest';
import { ChannelStrategyFactory } from './channel-strategy-factory.js';
import { WeChatStrategy } from './wechat-strategy.js';
import { WorkWeChatStrategy } from './work-wechat-strategy.js';
import { DingTalkStrategy } from './dingtalk-strategy.js';
import { FeishuStrategy } from './feishu-strategy.js';
import { BaseChannelStrategy } from './base-channel-strategy.js';
import type { Channel } from '../types/channel.js';

describe('ChannelStrategyFactory', () => {
  const factory = new ChannelStrategyFactory();

  describe('策略创建', () => {
    it('应该为微信渠道创建 WeChatStrategy', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'WeChat Channel',
        type: 'wechat',
        config: {
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const strategy = factory.createStrategy(channel);

      expect(strategy).toBeInstanceOf(WeChatStrategy);
      expect(strategy).toBeInstanceOf(BaseChannelStrategy);
    });

    it('应该为企业微信渠道创建 WorkWeChatStrategy', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'Work WeChat Channel',
        type: 'work_wechat',
        config: {
          corpId: 'test-corp-id',
          agentId: 1000001,
          corpSecret: 'test-corp-secret',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const strategy = factory.createStrategy(channel);

      expect(strategy).toBeInstanceOf(WorkWeChatStrategy);
      expect(strategy).toBeInstanceOf(BaseChannelStrategy);
    });

    it('应该为钉钉渠道创建 DingTalkStrategy', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'DingTalk Channel',
        type: 'dingtalk',
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const strategy = factory.createStrategy(channel);

      expect(strategy).toBeInstanceOf(DingTalkStrategy);
      expect(strategy).toBeInstanceOf(BaseChannelStrategy);
    });

    it('应该为飞书渠道创建 FeishuStrategy', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'Feishu Channel',
        type: 'feishu',
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const strategy = factory.createStrategy(channel);

      expect(strategy).toBeInstanceOf(FeishuStrategy);
      expect(strategy).toBeInstanceOf(BaseChannelStrategy);
    });

    it('应该为不支持的渠道类型抛出错误', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'Unknown Channel',
        type: 'unknown' as any,
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(() => factory.createStrategy(channel)).toThrow('Unsupported channel type: unknown');
    });
  });

  describe('策略实例', () => {
    it('创建的策略应该有正确的渠道能力', () => {
      const wechatChannel: Channel = {
        id: 'test-channel',
        name: 'WeChat Channel',
        type: 'wechat',
        config: {
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const strategy = factory.createStrategy(wechatChannel);
      const capability = strategy.getChannelCapability();

      expect(capability).toBe('token_managed');
    });

    it('Webhook 型渠道应该有正确的渠道能力', () => {
      const dingtalkChannel: Channel = {
        id: 'test-channel',
        name: 'DingTalk Channel',
        type: 'dingtalk',
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const strategy = factory.createStrategy(dingtalkChannel);
      const capability = strategy.getChannelCapability();

      expect(capability).toBe('webhook');
    });

    it('每次调用应该创建新的策略实例', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'WeChat Channel',
        type: 'wechat',
        config: {
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const strategy1 = factory.createStrategy(channel);
      const strategy2 = factory.createStrategy(channel);

      // 应该是不同的实例
      expect(strategy1).not.toBe(strategy2);
      // 但应该是相同的类型
      expect(strategy1.constructor).toBe(strategy2.constructor);
    });
  });

  describe('错误处理', () => {
    it('应该为 null 渠道类型抛出错误', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'Invalid Channel',
        type: null as any,
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(() => factory.createStrategy(channel)).toThrow('Unsupported channel type');
    });

    it('应该为 undefined 渠道类型抛出错误', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'Invalid Channel',
        type: undefined as any,
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(() => factory.createStrategy(channel)).toThrow('Unsupported channel type');
    });

    it('错误消息应该包含具体的渠道类型', () => {
      const channel: Channel = {
        id: 'test-channel',
        name: 'Invalid Channel',
        type: 'slack' as any,
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(() => factory.createStrategy(channel)).toThrow('Unsupported channel type: slack');
    });
  });

  describe('策略继承关系', () => {
    it('所有策略都应该继承自 BaseChannelStrategy', () => {
      const channels: Channel[] = [
        {
          id: 'wechat-channel',
          name: 'WeChat',
          type: 'wechat',
          config: { appId: 'test', appSecret: 'test' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'work-wechat-channel',
          name: 'Work WeChat',
          type: 'work_wechat',
          config: { corpId: 'test', agentId: 1, corpSecret: 'test' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'dingtalk-channel',
          name: 'DingTalk',
          type: 'dingtalk',
          config: { webhookUrl: 'https://test.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'feishu-channel',
          name: 'Feishu',
          type: 'feishu',
          config: { webhookUrl: 'https://test.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      channels.forEach(channel => {
        const strategy = factory.createStrategy(channel);
        expect(strategy).toBeInstanceOf(BaseChannelStrategy);
      });
    });
  });
});
