/**
 * WebhookStrategy 单元测试
 * 
 * 测试 Webhook 型渠道策略的实现
 * 需求: 12.3, 12.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebhookStrategy } from './webhook-strategy.js';
import { DingTalkStrategy } from './dingtalk-strategy.js';
import { FeishuStrategy } from './feishu-strategy.js';
import type { Channel } from '../types/channel.js';
import type { PushMessage } from './types.js';
import { ChannelCapability } from './types.js';

// 创建一个具体的 Webhook 策略用于测试
class TestWebhookStrategy extends WebhookStrategy {
  protected buildMessage(message: PushMessage, target: string): any {
    return {
      text: message.title,
      target,
    };
  }
}

describe('WebhookStrategy', () => {
  const mockChannel: Channel = {
    id: 'test-webhook-channel',
    name: 'Test Webhook Channel',
    type: 'dingtalk',
    config: {
      webhookUrl: 'https://example.com/webhook',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  let strategy: TestWebhookStrategy;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    strategy = new TestWebhookStrategy(mockChannel);
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('渠道能力', () => {
    it('应该返回 WEBHOOK 能力类型', () => {
      expect(strategy.getChannelCapability()).toBe(ChannelCapability.WEBHOOK);
    });
  });

  describe('Token 跳过逻辑 (需求 12.3)', () => {
    it('应该返回空字符串而不是实际 token', async () => {
      const token = await (strategy as any).getAccessToken();
      expect(token).toBe('');
    });

    it('不应该调用任何 API 获取 token', async () => {
      global.fetch = vi.fn();
      await (strategy as any).getAccessToken();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Webhook URL 发送 (需求 12.3)', () => {
    it('应该向配置的 Webhook URL 发送 POST 请求', async () => {
      const mockResponse = {
        errcode: 0,
        errmsg: 'ok',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      });

      const messageBody = { text: 'test message' };
      await (strategy as any).sendRequest('', messageBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBody),
        }
      );
    });

    it('应该正确解析成功响应', async () => {
      const mockResponse = {
        errcode: 0,
        errmsg: 'ok',
        msgid: '12345',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await (strategy as any).sendRequest('', { text: 'test' });

      expect(result.success).toBe(true);
      expect(result.msgId).toBe('12345');
      expect(result.error).toBe('ok');
    });

    it('应该正确解析失败响应', async () => {
      const mockResponse = {
        errcode: 40001,
        errmsg: 'invalid webhook url',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await (strategy as any).sendRequest('', { text: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid webhook url');
      expect(result.errorCode).toBe(40001);
    });

    it('应该处理网络错误', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await (strategy as any).sendRequest('', { text: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('应该支持不同的响应格式 (code/errcode)', async () => {
      const mockResponse = {
        code: 0,
        msg: 'success',
        message_id: 'msg-123',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await (strategy as any).sendRequest('', { text: 'test' });

      expect(result.success).toBe(true);
      expect(result.msgId).toBe('msg-123');
      expect(result.error).toBe('success');
    });
  });

  describe('完整发送流程', () => {
    it('应该成功发送消息到 Webhook', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 'test-msg-id',
        }),
      });

      const message: PushMessage = {
        title: 'Test Message',
        desp: 'Test Description',
      };

      const result = await strategy.send(message, ['target1']);

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].msgId).toBe('test-msg-id');
    });
  });
});

describe('DingTalkStrategy (需求 12.4)', () => {
  const mockChannel: Channel = {
    id: 'test-dingtalk-channel',
    name: 'Test DingTalk Channel',
    type: 'dingtalk',
    config: {
      webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  let strategy: DingTalkStrategy;

  beforeEach(() => {
    strategy = new DingTalkStrategy(mockChannel);
  });

  describe('消息格式构建', () => {
    it('应该构建正确的钉钉文本消息格式', () => {
      const message: PushMessage = {
        title: 'Test Title',
        desp: 'Test Description',
      };

      const messageBody = (strategy as any).buildMessage(message, '13800138000');

      expect(messageBody).toEqual({
        msgtype: 'text',
        text: {
          content: 'Test Title\n\nTest Description',
        },
        at: {
          atMobiles: ['13800138000'],
          isAtAll: false,
        },
      });
    });

    it('应该支持只有标题的消息', () => {
      const message: PushMessage = {
        title: 'Test Title',
      };

      const messageBody = (strategy as any).buildMessage(message, '13800138000');

      expect(messageBody.text.content).toBe('Test Title');
    });

    it('应该正确设置 @ 目标', () => {
      const message: PushMessage = {
        title: 'Test',
      };

      const messageBody = (strategy as any).buildMessage(message, '13900139000');

      expect(messageBody.at.atMobiles).toEqual(['13900139000']);
      expect(messageBody.at.isAtAll).toBe(false);
    });
  });
});

describe('FeishuStrategy (需求 12.4)', () => {
  const mockChannel: Channel = {
    id: 'test-feishu-channel',
    name: 'Test Feishu Channel',
    type: 'feishu',
    config: {
      webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  let strategy: FeishuStrategy;

  beforeEach(() => {
    strategy = new FeishuStrategy(mockChannel);
  });

  describe('消息格式构建', () => {
    it('应该构建正确的飞书文本消息格式', () => {
      const message: PushMessage = {
        title: 'Test Title',
        desp: 'Test Description',
      };

      const messageBody = (strategy as any).buildMessage(message, 'user-id-123');

      expect(messageBody).toEqual({
        msg_type: 'text',
        content: {
          text: 'Test Title\n\nTest Description',
        },
      });
    });

    it('应该支持只有标题的消息', () => {
      const message: PushMessage = {
        title: 'Test Title',
      };

      const messageBody = (strategy as any).buildMessage(message, 'user-id-123');

      expect(messageBody.content.text).toBe('Test Title');
    });

    it('应该使用正确的消息类型字段', () => {
      const message: PushMessage = {
        title: 'Test',
      };

      const messageBody = (strategy as any).buildMessage(message, 'user-id-123');

      expect(messageBody.msg_type).toBe('text');
    });
  });
});
