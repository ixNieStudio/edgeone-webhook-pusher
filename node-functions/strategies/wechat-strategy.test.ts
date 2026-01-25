/**
 * WeChatStrategy 单元测试
 * 
 * 测试微信渠道策略的实现
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WeChatStrategy } from './wechat-strategy.js';
import type { Channel } from '../types/channel.js';
import type { PushMessage } from './types.js';
import { ChannelCapability } from './types.js';
import * as kvClient from '../shared/kv-client.js';

// Mock KV client
vi.mock('../shared/kv-client.js', () => ({
  configKV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('WeChatStrategy', () => {
  const mockChannel: Channel = {
    id: 'test-channel',
    name: 'Test WeChat Channel',
    type: 'wechat',
    config: {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  let strategy: WeChatStrategy;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    strategy = new WeChatStrategy(mockChannel);
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('渠道能力', () => {
    it('应该返回 TOKEN_MANAGED 能力类型', () => {
      expect(strategy.getChannelCapability()).toBe(ChannelCapability.TOKEN_MANAGED);
    });
  });

  describe('getAccessToken', () => {
    it('应该从缓存获取有效的 token', async () => {
      const cachedToken = {
        accessToken: 'cached-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      vi.mocked(kvClient.configKV.get).mockResolvedValue(cachedToken);

      const token = await (strategy as any).getAccessToken();

      expect(token).toBe('cached-token');
      expect(kvClient.configKV.get).toHaveBeenCalledWith('wechat_token:test-app-id');
    });

    it('应该在缓存过期时请求新 token', async () => {
      const expiredToken = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000, // expired
      };

      vi.mocked(kvClient.configKV.get).mockResolvedValue(expiredToken);

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          access_token: 'new-token',
          expires_in: 7200,
        }),
      });

      const token = await (strategy as any).getAccessToken();

      expect(token).toBe('new-token');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.weixin.qq.com/cgi-bin/token')
      );
      expect(kvClient.configKV.put).toHaveBeenCalled();
    });

    it('应该在缓存不存在时请求新 token', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue(null);

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          access_token: 'new-token',
          expires_in: 7200,
        }),
      });

      const token = await (strategy as any).getAccessToken();

      expect(token).toBe('new-token');
      expect(kvClient.configKV.put).toHaveBeenCalledWith(
        'wechat_token:test-app-id',
        expect.objectContaining({
          accessToken: 'new-token',
        }),
        7000
      );
    });

    it('应该在 API 返回错误时抛出异常', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue(null);

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 40013,
          errmsg: 'invalid appid',
        }),
      });

      await expect((strategy as any).getAccessToken()).rejects.toThrow(
        'Failed to get access token: invalid appid (errcode: 40013)'
      );
    });

    it('应该在响应缺少 access_token 时抛出异常', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue(null);

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          expires_in: 7200,
        }),
      });

      await expect((strategy as any).getAccessToken()).rejects.toThrow(
        'Invalid access token response from WeChat API'
      );
    });
  });

  describe('buildMessage', () => {
    it('应该构建客服文本消息（只有标题）', () => {
      const message: PushMessage = {
        title: 'Test Title',
      };

      const result = (strategy as any).buildMessage(message, 'test-openid');

      expect(result).toEqual({
        touser: 'test-openid',
        msgtype: 'text',
        text: {
          content: 'Test Title',
        },
      });
    });

    it('应该构建客服文本消息（标题和描述）', () => {
      const message: PushMessage = {
        title: 'Test Title',
        desp: 'Test Description',
      };

      const result = (strategy as any).buildMessage(message, 'test-openid');

      expect(result).toEqual({
        touser: 'test-openid',
        msgtype: 'text',
        text: {
          content: 'Test Title\n\nTest Description',
        },
      });
    });

    it('应该构建模板消息（使用 templateData）', () => {
      const message: PushMessage = {
        title: 'Test Title',
        templateId: 'template-123',
        templateData: {
          first: { value: 'First Value' },
          keyword1: { value: 'Keyword 1' },
          remark: { value: 'Remark' },
        },
      };

      const result = (strategy as any).buildMessage(message, 'test-openid');

      expect(result).toEqual({
        touser: 'test-openid',
        template_id: 'template-123',
        data: {
          first: { value: 'First Value' },
          keyword1: { value: 'Keyword 1' },
          remark: { value: 'Remark' },
        },
      });
    });

    it('应该构建模板消息（使用默认 templateData）', () => {
      const message: PushMessage = {
        title: 'Test Title',
        desp: 'Test Description',
        templateId: 'template-123',
      };

      const result = (strategy as any).buildMessage(message, 'test-openid');

      expect(result).toEqual({
        touser: 'test-openid',
        template_id: 'template-123',
        data: {
          first: { value: 'Test Title' },
          keyword1: { value: 'Test Description' },
          remark: { value: '' },
        },
      });
    });
  });

  describe('sendRequest', () => {
    it('应该成功发送客服消息', async () => {
      const messageBody = {
        touser: 'test-openid',
        msgtype: 'text',
        text: { content: 'Test Message' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 123456,
        }),
      });

      const result = await (strategy as any).sendRequest('test-token', messageBody);

      expect(result).toEqual({
        success: true,
        msgId: '123456',
        error: 'ok',
        errorCode: 0,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=test-token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBody),
        })
      );
    });

    it('应该成功发送模板消息', async () => {
      const messageBody = {
        touser: 'test-openid',
        template_id: 'template-123',
        data: { first: { value: 'Test' } },
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 789012,
        }),
      });

      const result = await (strategy as any).sendRequest('test-token', messageBody);

      expect(result).toEqual({
        success: true,
        msgId: '789012',
        error: 'ok',
        errorCode: 0,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=test-token',
        expect.any(Object)
      );
    });

    it('应该在 token 失效时自动重试（40001）', async () => {
      const messageBody = {
        touser: 'test-openid',
        msgtype: 'text',
        text: { content: 'Test Message' },
      };

      // First call returns token invalid error
      // Second call (after token refresh) succeeds
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 40001,
            errmsg: 'invalid credential',
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            access_token: 'new-token',
            expires_in: 7200,
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            msgid: 123456,
          }),
        });

      vi.mocked(kvClient.configKV.get).mockResolvedValue(null);

      const result = await (strategy as any).sendRequest('old-token', messageBody);

      expect(result.success).toBe(true);
      expect(kvClient.configKV.delete).toHaveBeenCalledWith('wechat_token:test-app-id');
      expect(global.fetch).toHaveBeenCalledTimes(3); // original send + token refresh + retry send
    });

    it('应该在 token 过期时自动重试（42001）', async () => {
      const messageBody = {
        touser: 'test-openid',
        msgtype: 'text',
        text: { content: 'Test Message' },
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 42001,
            errmsg: 'access_token expired',
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            access_token: 'new-token',
            expires_in: 7200,
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            msgid: 123456,
          }),
        });

      vi.mocked(kvClient.configKV.get).mockResolvedValue(null);

      const result = await (strategy as any).sendRequest('expired-token', messageBody);

      expect(result.success).toBe(true);
      expect(kvClient.configKV.delete).toHaveBeenCalled();
    });

    it('应该处理其他 API 错误（不重试）', async () => {
      const messageBody = {
        touser: 'test-openid',
        msgtype: 'text',
        text: { content: 'Test Message' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 45015,
          errmsg: 'user not followed',
        }),
      });

      const result = await (strategy as any).sendRequest('test-token', messageBody);

      expect(result).toEqual({
        success: false,
        msgId: undefined,
        error: 'user not followed',
        errorCode: 45015,
      });

      // Should not retry for non-token errors
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('完整发送流程', () => {
    it('应该成功发送消息到单个目标', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue({
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 123456,
        }),
      });

      const message: PushMessage = {
        title: 'Test Message',
        desp: 'Test Description',
      };

      const result = await strategy.send(message, ['openid-1']);

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0]).toMatchObject({
        openId: 'openid-1',
        success: true,
        msgId: '123456',
      });
    });

    it('应该成功发送消息到多个目标', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue({
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 123456,
        }),
      });

      const message: PushMessage = {
        title: 'Test Message',
      };

      const result = await strategy.send(message, ['openid-1', 'openid-2', 'openid-3']);

      expect(result.total).toBe(3);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('应该处理部分失败的情况', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue({
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
      });

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({
            json: async () => ({
              errcode: 45015,
              errmsg: 'user not followed',
            }),
          });
        }
        return Promise.resolve({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            msgid: 123456,
          }),
        });
      });

      const message: PushMessage = {
        title: 'Test Message',
      };

      const result = await strategy.send(message, ['openid-1', 'openid-2', 'openid-3']);

      expect(result.total).toBe(3);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('user not followed');
    });

    it('应该在发送过程中处理异常', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue({
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const message: PushMessage = {
        title: 'Test Message',
      };

      const result = await strategy.send(message, ['openid-1']);

      expect(result.total).toBe(1);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        openId: 'openid-1',
        success: false,
        error: 'Network error',
      });
    });

    it('应该处理空目标列表', async () => {
      const message: PushMessage = {
        title: 'Test Message',
      };

      const result = await strategy.send(message, []);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理缺少标题的消息', async () => {
      const message: PushMessage = {
        title: '',
      };

      await expect(strategy.send(message, ['openid-1'])).rejects.toThrow(
        'Message title is required'
      );
    });

    it('应该处理 token 缓存边界情况（即将过期）', async () => {
      // Token expires in 1 second
      const almostExpiredToken = {
        accessToken: 'almost-expired-token',
        expiresAt: Date.now() + 1000,
      };

      vi.mocked(kvClient.configKV.get).mockResolvedValue(almostExpiredToken);

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 123456,
        }),
      });

      const message: PushMessage = {
        title: 'Test Message',
      };

      const result = await strategy.send(message, ['openid-1']);

      // Should still use the cached token since it's not expired yet
      expect(result.success).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('message/custom/send'),
        expect.any(Object)
      );
    });

    it('应该处理 msgid 为 0 的情况', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue({
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 0,
        }),
      });

      const message: PushMessage = {
        title: 'Test Message',
      };

      const result = await strategy.send(message, ['openid-1']);

      expect(result.success).toBe(1);
      expect(result.results[0].msgId).toBe('0');
    });

    it('应该处理没有 msgid 的成功响应', async () => {
      vi.mocked(kvClient.configKV.get).mockResolvedValue({
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
        }),
      });

      const message: PushMessage = {
        title: 'Test Message',
      };

      const result = await strategy.send(message, ['openid-1']);

      expect(result.success).toBe(1);
      expect(result.results[0].msgId).toBeUndefined();
    });
  });
});
