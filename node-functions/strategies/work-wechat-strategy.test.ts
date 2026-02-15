/**
 * WorkWeChatStrategy 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkWeChatStrategy } from './work-wechat-strategy.js';
import type { Channel, WorkWeChatConfig } from '../types/channel.js';
import type { PushMessage } from './types.js';
import { ChannelCapability } from './types.js';
import { configKV } from '../shared/kv-client.js';

// Mock fetch
global.fetch = vi.fn();

// Mock configKV
vi.mock('../shared/kv-client.js', () => ({
  configKV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('WorkWeChatStrategy', () => {
  let strategy: WorkWeChatStrategy;
  let mockChannel: Channel;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const config: WorkWeChatConfig = {
      corpId: 'test-corp-id',
      agentId: 1000001,
      corpSecret: 'test-corp-secret',
    };

    mockChannel = {
      id: 'test-channel-id',
      name: 'Test WorkWeChat Channel',
      type: 'work_wechat',
      config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    strategy = new WorkWeChatStrategy(mockChannel);
  });
  
  describe('配置验证', () => {
    it('应该在缺少 corpId 时抛出错误', () => {
      const invalidChannel = {
        ...mockChannel,
        config: {
          agentId: 1000001,
          corpSecret: 'test-secret',
        } as any,
      };
      
      expect(() => new WorkWeChatStrategy(invalidChannel)).toThrow('Missing required config: corpId');
    });
    
    it('应该在缺少 agentId 时抛出错误', () => {
      const invalidChannel = {
        ...mockChannel,
        config: {
          corpId: 'test-corp-id',
          corpSecret: 'test-secret',
        } as any,
      };
      
      expect(() => new WorkWeChatStrategy(invalidChannel)).toThrow('Missing required config: agentId');
    });
    
    it('应该在缺少 corpSecret 时抛出错误', () => {
      const invalidChannel = {
        ...mockChannel,
        config: {
          corpId: 'test-corp-id',
          agentId: 1000001,
        } as any,
      };
      
      expect(() => new WorkWeChatStrategy(invalidChannel)).toThrow('Missing required config: corpSecret');
    });
    
    it('应该在所有必需字段存在时成功创建', () => {
      expect(() => new WorkWeChatStrategy(mockChannel)).not.toThrow();
    });
  });

  describe('getChannelCapability', () => {
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

      vi.mocked(configKV.get).mockResolvedValue(cachedToken);

      const token = await strategy['getAccessToken']();

      expect(token).toBe('cached-token');
      expect(configKV.get).toHaveBeenCalledWith('work_wechat_token:test-corp-id:1000001');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('应该在缓存过期时请求新 token', async () => {
      const expiredToken = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000, // expired
      };

      vi.mocked(configKV.get).mockResolvedValue(expiredToken);
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          access_token: 'new-token',
          expires_in: 7200,
        }),
      } as Response);

      const token = await strategy['getAccessToken']();

      expect(token).toBe('new-token');
      expect(fetch).toHaveBeenCalledWith(
        'https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=test-corp-id&corpsecret=test-corp-secret'
      );
      expect(configKV.put).toHaveBeenCalled();
    });

    it('应该在缓存为空时请求新 token', async () => {
      vi.mocked(configKV.get).mockResolvedValue(null);
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          access_token: 'new-token',
          expires_in: 7200,
        }),
      } as Response);

      const token = await strategy['getAccessToken']();

      expect(token).toBe('new-token');
      expect(configKV.put).toHaveBeenCalled();
    });

    it('应该在 API 返回错误时抛出异常', async () => {
      vi.mocked(configKV.get).mockResolvedValue(null);
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          errcode: 40013,
          errmsg: 'invalid corpid',
        }),
      } as Response);

      await expect(strategy['getAccessToken']()).rejects.toThrow(
        'Failed to get access token: invalid corpid (errcode: 40013)'
      );
    });
  });

  describe('buildMessage', () => {
    it('应该为用户ID构建正确的消息体', () => {
      const message: PushMessage = {
        title: 'Test Title',
        desp: 'Test Description',
      };

      const messageBody = strategy['buildMessage'](message, 'user123');

      expect(messageBody).toEqual({
        touser: 'user123',
        toparty: undefined,
        msgtype: 'text',
        agentid: 1000001,
        text: {
          content: 'Test Title\n\nTest Description',
        },
      });
    });

    it('应该为部门ID构建正确的消息体', () => {
      const message: PushMessage = {
        title: 'Test Title',
        desp: 'Test Description',
      };

      const messageBody = strategy['buildMessage'](message, 'dept_456');

      expect(messageBody).toEqual({
        touser: undefined,
        toparty: '456',
        msgtype: 'text',
        agentid: 1000001,
        text: {
          content: 'Test Title\n\nTest Description',
        },
      });
    });

    it('应该在没有描述时只使用标题', () => {
      const message: PushMessage = {
        title: 'Test Title',
      };

      const messageBody = strategy['buildMessage'](message, 'user123');

      expect(messageBody.text.content).toBe('Test Title');
    });
    
    it('应该转义特殊字符', () => {
      const message: PushMessage = {
        title: 'Test <Title> & "Quote"',
        desp: "Description with 'single' quotes",
      };

      const messageBody = strategy['buildMessage'](message, 'user123');

      expect(messageBody.text.content).toBe(
        'Test &lt;Title&gt; &amp; &quot;Quote&quot;\n\nDescription with &#39;single&#39; quotes'
      );
    });
    
    it('应该截断超长消息', () => {
      const longText = 'a'.repeat(3000);
      const message: PushMessage = {
        title: longText,
      };

      const messageBody = strategy['buildMessage'](message, 'user123');

      expect(messageBody.text.content.length).toBe(2048);
      expect(messageBody.text.content).toMatch(/\.\.\.$/);
    });
    
    it('应该在截断前转义特殊字符', () => {
      // Create a message that's long and has special chars
      const longText = '<test>'.repeat(500); // 3000 chars
      const message: PushMessage = {
        title: longText,
      };

      const messageBody = strategy['buildMessage'](message, 'user123');

      // Should be truncated to 2048 and contain escaped chars
      expect(messageBody.text.content.length).toBe(2048);
      expect(messageBody.text.content).toContain('&lt;test&gt;');
      expect(messageBody.text.content).toMatch(/\.\.\.$/);
    });
  });

  describe('sendRequest', () => {
    it('应该成功发送消息', async () => {
      const messageBody = {
        touser: 'user123',
        msgtype: 'text',
        agentid: 1000001,
        text: { content: 'Test' },
      };

      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 'msg123',
        }),
      } as Response);

      const result = await strategy['sendRequest']('test-token', messageBody);

      expect(result).toEqual({
        success: true,
        msgId: 'msg123',
        error: 'ok',
        errorCode: 0,
      });
      expect(fetch).toHaveBeenCalledWith(
        'https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=test-token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBody),
        }
      );
    });

    it('应该在 token 失效时自动重试（错误码 40014）', async () => {
      const messageBody = {
        touser: 'user123',
        msgtype: 'text',
        agentid: 1000001,
        text: { content: 'Test' },
      };

      // First call returns token invalid error
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 40014,
            errmsg: 'invalid access_token',
          }),
        } as Response)
        // getAccessToken call
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            access_token: 'new-token',
            expires_in: 7200,
          }),
        } as Response)
        // Retry call succeeds
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            msgid: 'msg123',
          }),
        } as Response);

      vi.mocked(configKV.get).mockResolvedValue(null);

      const result = await strategy['sendRequest']('old-token', messageBody);

      expect(result.success).toBe(true);
      expect(configKV.delete).toHaveBeenCalledWith('work_wechat_token:test-corp-id:1000001');
      expect(fetch).toHaveBeenCalledTimes(3); // original + getToken + retry
    });

    it('应该在 token 过期时自动重试（错误码 42001）', async () => {
      const messageBody = {
        touser: 'user123',
        msgtype: 'text',
        agentid: 1000001,
        text: { content: 'Test' },
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 42001,
            errmsg: 'access_token expired',
          }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            access_token: 'new-token',
            expires_in: 7200,
          }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            msgid: 'msg123',
          }),
        } as Response);

      vi.mocked(configKV.get).mockResolvedValue(null);

      const result = await strategy['sendRequest']('old-token', messageBody);

      expect(result.success).toBe(true);
      expect(configKV.delete).toHaveBeenCalled();
    });

    it('应该在其他错误时不重试', async () => {
      const messageBody = {
        touser: 'user123',
        msgtype: 'text',
        agentid: 1000001,
        text: { content: 'Test' },
      };

      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          errcode: 60020,
          errmsg: 'userid not found',
        }),
      } as Response);

      const result = await strategy['sendRequest']('test-token', messageBody);

      expect(result).toEqual({
        success: false,
        msgId: undefined,
        error: 'userid not found',
        errorCode: 60020,
      });
      expect(fetch).toHaveBeenCalledTimes(1); // no retry
    });
  });

  describe('send (integration)', () => {
    it('应该成功发送消息到多个目标', async () => {
      vi.mocked(configKV.get).mockResolvedValue({
        accessToken: 'test-token',
        expiresAt: Date.now() + 3600000,
      });

      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          errcode: 0,
          errmsg: 'ok',
          msgid: 'msg123',
        }),
      } as Response);

      const message: PushMessage = {
        title: 'Test Title',
        desp: 'Test Description',
      };

      const result = await strategy.send(message, ['user1', 'dept_2', 'user3']);

      expect(result.total).toBe(3);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].openId).toBe('user1');
      expect(result.results[1].openId).toBe('dept_2');
      expect(result.results[2].openId).toBe('user3');
    });

    it('应该处理部分失败的情况', async () => {
      vi.mocked(configKV.get).mockResolvedValue({
        accessToken: 'test-token',
        expiresAt: Date.now() + 3600000,
      });

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            msgid: 'msg1',
          }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 60020,
            errmsg: 'userid not found',
          }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({
            errcode: 0,
            errmsg: 'ok',
            msgid: 'msg3',
          }),
        } as Response);

      const message: PushMessage = {
        title: 'Test Title',
      };

      const result = await strategy.send(message, ['user1', 'invalid-user', 'user3']);

      expect(result.total).toBe(3);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('userid not found');
      expect(result.results[2].success).toBe(true);
    });
  });
});
