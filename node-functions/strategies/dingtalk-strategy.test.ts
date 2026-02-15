/**
 * DingTalkStrategy Unit Tests
 *
 * Comprehensive test coverage for DingTalk strategy including:
 * - Message building with title/description
 * - @mentions functionality (atMobiles, isAtAll)
 * - HMAC-SHA256 signature generation
 * - Response parsing
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DingTalkStrategy } from './dingtalk-strategy.js';
import type { Channel } from '../types/channel.js';

describe('DingTalkStrategy', () => {
  let strategy: DingTalkStrategy;
  let mockChannel: Channel;

  beforeEach(() => {
    mockChannel = {
      id: 'test-channel',
      type: 'dingtalk',
      name: 'Test DingTalk',
      config: {
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test123',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    strategy = new DingTalkStrategy(mockChannel);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Message Building', () => {
    it('should build text message with title only', () => {
      const message = {
        title: 'Test Alert',
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result).toEqual({
        msgtype: 'text',
        text: {
          content: 'Test Alert',
        },
      });
    });

    it('should build text message with title and description', () => {
      const message = {
        title: 'Test Alert',
        desp: 'This is a test message',
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result).toEqual({
        msgtype: 'text',
        text: {
          content: 'Test Alert\n\nThis is a test message',
        },
      });
    });

    it('should throw error when message exceeds 20000 characters', () => {
      const longMessage = {
        title: 'Test',
        desp: 'x'.repeat(20000),
      };

      expect(() => {
        strategy['buildMessage'](longMessage, 'target');
      }).toThrow(/exceeds.*20,?000 characters/i);
    });

    it('should handle empty description', () => {
      const message = {
        title: 'Test',
        desp: '',
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.text.content).toBe('Test');
    });
  });

  describe('@mentions Functionality', () => {
    it('should build message with @mentions from message', () => {
      const message = {
        title: 'Alert',
        desp: 'Check this',
        atMobiles: ['13800138000', '13900139000'],
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.at).toEqual({
        atMobiles: ['13800138000', '13900139000'],
        isAtAll: false,
      });
    });

    it('should build message with @mentions from channel config', () => {
      const channelWithMentions: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
          atMobiles: ['13800138000'],
        },
      };
      const strategyWithConfig = new DingTalkStrategy(channelWithMentions);

      const message = { title: 'Alert' };
      const result = strategyWithConfig['buildMessage'](message, 'target');

      expect(result.at).toEqual({
        atMobiles: ['13800138000'],
        isAtAll: false,
      });
    });

    it('should prioritize message atMobiles over channel config', () => {
      const channelWithMentions: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
          atMobiles: ['13800138000'],
        },
      };
      const strategyWithConfig = new DingTalkStrategy(channelWithMentions);

      const message = {
        title: 'Alert',
        atMobiles: ['13900139000'],
      };

      const result = strategyWithConfig['buildMessage'](message, 'target');

      expect(result.at.atMobiles).toEqual(['13900139000']);
    });

    it('should build message with @all flag', () => {
      const message = {
        title: 'Important',
        desp: 'Everyone read this',
        atAll: true,
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.at).toEqual({
        atMobiles: [],
        isAtAll: true,
      });
    });

    it('should handle both atMobiles and atAll', () => {
      const message = {
        title: 'Critical',
        atMobiles: ['13800138000'],
        atAll: true,
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.at).toEqual({
        atMobiles: ['13800138000'],
        isAtAll: true,
      });
    });

    it('should omit at field when no mentions', () => {
      const message = {
        title: 'Regular message',
        desp: 'No mentions',
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.at).toBeUndefined();
    });

    it('should omit at field when empty atMobiles and isAtAll false', () => {
      const message = {
        title: 'Test',
        atMobiles: [],
        atAll: false,
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.at).toBeUndefined();
    });
  });

  describe('Response Parsing', () => {
    it('should parse success response', () => {
      const response = { errcode: 0, errmsg: 'ok' };
      const result = strategy['parseResponse'](response);

      expect(result).toEqual({
        success: true,
        msgId: undefined,
      });
    });

    it('should parse error response with signature failure', () => {
      const response = { errcode: 310000, errmsg: 'sign not match' };
      const result = strategy['parseResponse'](response);

      expect(result).toEqual({
        success: false,
        error: 'sign not match',
        errorCode: 310000,
      });
    });

    it('should parse error response with keywords missing', () => {
      const response = { errcode: 310000, errmsg: 'keywords not in content' };
      const result = strategy['parseResponse'](response);

      expect(result).toEqual({
        success: false,
        error: 'keywords not in content',
        errorCode: 310000,
      });
    });

    it('should parse error response with invalid access token', () => {
      const response = { errcode: 300001, errmsg: 'invalid access_token' };
      const result = strategy['parseResponse'](response);

      expect(result).toEqual({
        success: false,
        error: 'invalid access_token',
        errorCode: 300001,
      });
    });
  });

  describe('Signature Generation', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
          secret: 'SECtest123456789',
        },
      };
      const strategyWithSecret = new DingTalkStrategy(channelWithSecret);

      // Mock Date.now() for deterministic timestamp
      const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const { timestamp, sign } = strategyWithSecret['generateSignature']('SECtest123456789');

      expect(timestamp).toBe(mockTimestamp);
      expect(sign).toBeTruthy();
      expect(typeof sign).toBe('string');

      // Verify signature is URL-encoded Base64
      expect(sign).toMatch(/^[A-Za-z0-9%+/=]+$/);
    });

    it('should generate different signatures for different secrets', () => {
      const strategy1 = new DingTalkStrategy({
        ...mockChannel,
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
          secret: 'SECsecret1',
        },
      });

      const strategy2 = new DingTalkStrategy({
        ...mockChannel,
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
          secret: 'SECsecret2',
        },
      });

      const mockTimestamp = 1609459200000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const sig1 = strategy1['generateSignature']('SECsecret1');
      const sig2 = strategy2['generateSignature']('SECsecret2');

      expect(sig1.sign).not.toBe(sig2.sign);
    });

    it('should generate different signatures for different timestamps', () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
          secret: 'SECtest123',
        },
      };
      const strategyWithSecret = new DingTalkStrategy(channelWithSecret);

      const timestamp1 = 1609459200000;
      vi.spyOn(Date, 'now').mockReturnValue(timestamp1);
      const sig1 = strategyWithSecret['generateSignature']('SECtest123');

      const timestamp2 = 1609459300000;
      vi.spyOn(Date, 'now').mockReturnValue(timestamp2);
      const sig2 = strategyWithSecret['generateSignature']('SECtest123');

      expect(sig1.sign).not.toBe(sig2.sign);
    });
  });

  describe('Send Request', () => {
    it('should include signature in URL when secret configured', async () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
          secret: 'SECtest123',
        },
      };
      const strategyWithSecret = new DingTalkStrategy(channelWithSecret);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errcode: 0, errmsg: 'ok' }),
      });
      global.fetch = mockFetch;

      const messageBody = { msgtype: 'text', text: { content: 'Test' } };
      await strategyWithSecret['sendRequest']('', messageBody);

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('timestamp=');
      expect(callUrl).toContain('sign=');
    });

    it('should not include signature when secret not configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errcode: 0, errmsg: 'ok' }),
      });
      global.fetch = mockFetch;

      const messageBody = { msgtype: 'text', text: { content: 'Test' } };
      await strategy['sendRequest']('', messageBody);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).not.toContain('timestamp=');
      expect(callUrl).not.toContain('sign=');
    });

    it('should include correct Content-Type header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errcode: 0, errmsg: 'ok' }),
      });
      global.fetch = mockFetch;

      const messageBody = { msgtype: 'text', text: { content: 'Test' } };
      await strategy['sendRequest']('', messageBody);

      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.headers['Content-Type']).toBe('application/json; charset=utf-8');
    });

    it('should handle HTTP errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });
      global.fetch = mockFetch;

      const messageBody = { msgtype: 'text', text: { content: 'Test' } };
      const result = await strategy['sendRequest']('', messageBody);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const messageBody = { msgtype: 'text', text: { content: 'Test' } };
      const result = await strategy['sendRequest']('', messageBody);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});
