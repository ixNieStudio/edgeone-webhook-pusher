/**
 * BaseChannelStrategy 单元测试
 * 
 * 测试模板方法模式的基础架构
 */

import { describe, it, expect } from 'vitest';
import { BaseChannelStrategy } from './base-channel-strategy.js';
import type { Channel } from '../types/channel.js';
import type { PushMessage, SendResult, ChannelCapability } from './types.js';
import { ChannelCapability as ChannelCapabilityEnum } from './types.js';

// 创建一个测试用的具体策略类
class TestChannelStrategy extends BaseChannelStrategy {
  public getAccessTokenCalled = false;
  public buildMessageCalled = false;
  public sendRequestCalled = false;
  public callOrder: string[] = [];

  getChannelCapability(): ChannelCapability {
    return ChannelCapabilityEnum.TOKEN_MANAGED;
  }

  protected async getAccessToken(): Promise<string> {
    this.getAccessTokenCalled = true;
    this.callOrder.push('getAccessToken');
    return 'test-token';
  }

  protected buildMessage(message: PushMessage, target: string): any {
    this.buildMessageCalled = true;
    this.callOrder.push('buildMessage');
    return {
      to: target,
      content: message.title,
    };
  }

  protected async sendRequest(_token: string, _messageBody: any): Promise<SendResult> {
    this.sendRequestCalled = true;
    this.callOrder.push('sendRequest');
    return {
      success: true,
      msgId: 'test-msg-id',
    };
  }
}

describe('BaseChannelStrategy', () => {
  const mockChannel: Channel = {
    id: 'test-channel',
    name: 'Test Channel',
    type: 'wechat',
    config: {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('模板方法流程', () => {
    it('应该按正确顺序调用抽象方法', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
        desp: 'Test Description',
      };
      const targets = ['target1'];

      await strategy.send(message, targets);

      // 验证所有方法都被调用
      expect(strategy.getAccessTokenCalled).toBe(true);
      expect(strategy.buildMessageCalled).toBe(true);
      expect(strategy.sendRequestCalled).toBe(true);

      // 验证调用顺序
      expect(strategy.callOrder).toEqual([
        'getAccessToken',
        'buildMessage',
        'sendRequest',
      ]);
    });

    it('应该为每个目标调用一次发送流程', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets = ['target1', 'target2', 'target3'];

      const result = await strategy.send(message, targets);

      // 验证结果数量
      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('应该正确处理发送成功的情况', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets = ['target1'];

      const result = await strategy.send(message, targets);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].msgId).toBe('test-msg-id');
      expect(result.results[0].openId).toBe('target1');
    });

    it('应该正确处理发送失败的情况', async () => {
      class FailingStrategy extends TestChannelStrategy {
        protected async sendRequest(): Promise<SendResult> {
          this.sendRequestCalled = true;
          this.callOrder.push('sendRequest');
          return {
            success: false,
            error: 'Send failed',
            errorCode: 40001,
          };
        }
      }

      const strategy = new FailingStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets = ['target1'];

      const result = await strategy.send(message, targets);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Send failed');
    });

    it('应该正确处理异常情况', async () => {
      class ThrowingStrategy extends TestChannelStrategy {
        protected async sendRequest(): Promise<SendResult> {
          throw new Error('Network error');
        }
      }

      const strategy = new ThrowingStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets = ['target1'];

      const result = await strategy.send(message, targets);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Network error');
    });
  });

  describe('参数校验', () => {
    it('应该拒绝空标题', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: '',
      };
      const targets = ['target1'];

      await expect(strategy.send(message, targets)).rejects.toThrow('Message title is required');
    });

    it('应该接受有效的消息', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Valid Title',
      };
      const targets = ['target1'];

      const result = await strategy.send(message, targets);
      expect(result.success).toBe(1);
    });
  });

  describe('部分失败容错', () => {
    it('应该继续处理其他目标即使某个目标失败', async () => {
      let callCount = 0;
      class PartialFailStrategy extends TestChannelStrategy {
        protected async sendRequest(): Promise<SendResult> {
          callCount++;
          if (callCount === 2) {
            return {
              success: false,
              error: 'Target 2 failed',
            };
          }
          return {
            success: true,
            msgId: `msg-${callCount}`,
          };
        }
      }

      const strategy = new PartialFailStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets = ['target1', 'target2', 'target3'];

      const result = await strategy.send(message, targets);

      expect(result.total).toBe(3);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });
  });

  describe('返回结果格式', () => {
    it('应该返回正确的 PushResult 格式', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets = ['target1', 'target2'];

      const result = await strategy.send(message, targets);

      expect(result).toHaveProperty('pushId');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('results');
      expect(typeof result.pushId).toBe('string');
      expect(result.pushId.length).toBeGreaterThan(0);
    });

    it('应该处理空目标列表', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets: string[] = [];

      const result = await strategy.send(message, targets);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('模板方法不可变性', () => {
    it('子类不能改变模板方法的执行顺序', async () => {
      // 即使子类尝试改变顺序，模板方法仍然按固定顺序执行
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Test Message',
      };
      const targets = ['target1'];

      await strategy.send(message, targets);

      // 验证顺序始终是固定的
      expect(strategy.callOrder[0]).toBe('getAccessToken');
      expect(strategy.callOrder[1]).toBe('buildMessage');
      expect(strategy.callOrder[2]).toBe('sendRequest');
    });

    it('应该在参数校验失败时不调用其他方法', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: '', // 空标题会导致校验失败
      };
      const targets = ['target1'];

      await expect(strategy.send(message, targets)).rejects.toThrow();

      // 验证其他方法没有被调用
      expect(strategy.getAccessTokenCalled).toBe(false);
      expect(strategy.buildMessageCalled).toBe(false);
      expect(strategy.sendRequestCalled).toBe(false);
    });
  });

  describe('消息格式支持', () => {
    it('应该支持只有标题的消息', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Simple Title',
      };
      const targets = ['target1'];

      const result = await strategy.send(message, targets);

      expect(result.success).toBe(1);
      expect(strategy.buildMessageCalled).toBe(true);
    });

    it('应该支持带描述的消息', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Title',
        desp: 'Description',
      };
      const targets = ['target1'];

      const result = await strategy.send(message, targets);

      expect(result.success).toBe(1);
    });

    it('应该支持模板消息', async () => {
      const strategy = new TestChannelStrategy(mockChannel);
      const message: PushMessage = {
        title: 'Template Title',
        templateId: 'template-123',
        templateData: {
          key1: 'value1',
          key2: 'value2',
        },
      };
      const targets = ['target1'];

      const result = await strategy.send(message, targets);

      expect(result.success).toBe(1);
    });
  });
});
