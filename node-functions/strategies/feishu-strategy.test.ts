/**
 * FeishuStrategy Unit Tests
 *
 * Comprehensive test coverage for Feishu strategy including:
 * - Message building with title/description
 * - SHA-256 signature generation (NOT HMAC-SHA256)
 * - Response parsing (both new and legacy formats)
 * - Timestamp validation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeishuStrategy } from './feishu-strategy.js';
import type { Channel } from '../types/channel.js';

describe('FeishuStrategy', () => {
  let strategy: FeishuStrategy;
  let mockChannel: Channel;

  beforeEach(() => {
    mockChannel = {
      id: 'test-channel',
      type: 'feishu',
      name: 'Test Feishu',
      config: {
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test-key',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    strategy = new FeishuStrategy(mockChannel);
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
        msg_type: 'text',
        content: {
          text: 'Test Alert',
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
        msg_type: 'text',
        content: {
          text: 'Test Alert\n\nThis is a test message',
        },
      });
    });

    it('should throw error when message exceeds 30000 characters', () => {
      const longMessage = {
        title: 'Test',
        desp: 'x'.repeat(30000),
      };

      expect(() => {
        strategy['buildMessage'](longMessage, 'target');
      }).toThrow(/exceeds.*30,?000 characters/i);
    });

    it('should handle empty description', () => {
      const message = {
        title: 'Test',
        desp: '',
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.content.text).toBe('Test');
    });

    it('should not include signature when secret not configured', () => {
      const message = {
        title: 'Test',
      };

      const result = strategy['buildMessage'](message, 'target');

      expect(result.timestamp).toBeUndefined();
      expect(result.sign).toBeUndefined();
    });

    it('should include signature when secret configured', () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'abcdef1234567890abcdef1234567890',
        },
      };
      const strategyWithSecret = new FeishuStrategy(channelWithSecret);

      const message = {
        title: 'Test',
      };

      const result = strategyWithSecret['buildMessage'](message, 'target');

      expect(result.timestamp).toBeDefined();
      expect(result.sign).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.sign).toBe('string');
    });
  });

  describe('Signature Generation', () => {
    it('should generate valid SHA-256 signature', () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'abcdef1234567890abcdef1234567890',
        },
      };
      const strategyWithSecret = new FeishuStrategy(channelWithSecret);

      // Mock Date.now() for deterministic timestamp
      const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const timestamp = Math.floor(mockTimestamp / 1000).toString();
      const body = JSON.stringify({ msg_type: 'text', content: { text: 'Test' } });
      const sign = strategyWithSecret['generateSignature']('abcdef1234567890abcdef1234567890', timestamp, body);

      expect(sign).toBeTruthy();
      expect(typeof sign).toBe('string');
      // SHA-256 produces lowercase hexadecimal (64 characters)
      expect(sign).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different signatures for different secrets', () => {
      const strategy1 = new FeishuStrategy({
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'secret1234567890abcdef1234567890',
        },
      });

      const strategy2 = new FeishuStrategy({
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'secret2234567890abcdef1234567890',
        },
      });

      const timestamp = '1609459200';
      const body = JSON.stringify({ msg_type: 'text', content: { text: 'Test' } });

      const sig1 = strategy1['generateSignature']('secret1234567890abcdef1234567890', timestamp, body);
      const sig2 = strategy2['generateSignature']('secret2234567890abcdef1234567890', timestamp, body);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'abcdef1234567890abcdef1234567890',
        },
      };
      const strategyWithSecret = new FeishuStrategy(channelWithSecret);

      const body = JSON.stringify({ msg_type: 'text', content: { text: 'Test' } });

      const sig1 = strategyWithSecret['generateSignature']('abcdef1234567890abcdef1234567890', '1609459200', body);
      const sig2 = strategyWithSecret['generateSignature']('abcdef1234567890abcdef1234567890', '1609459300', body);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different bodies', () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'abcdef1234567890abcdef1234567890',
        },
      };
      const strategyWithSecret = new FeishuStrategy(channelWithSecret);

      const timestamp = '1609459200';
      const body1 = JSON.stringify({ msg_type: 'text', content: { text: 'Test1' } });
      const body2 = JSON.stringify({ msg_type: 'text', content: { text: 'Test2' } });

      const sig1 = strategyWithSecret['generateSignature']('abcdef1234567890abcdef1234567890', timestamp, body1);
      const sig2 = strategyWithSecret['generateSignature']('abcdef1234567890abcdef1234567890', timestamp, body2);

      expect(sig1).not.toBe(sig2);
    });

    it('should use timestamp in seconds not milliseconds', () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'abcdef1234567890abcdef1234567890',
        },
      };
      const strategyWithSecret = new FeishuStrategy(channelWithSecret);

      const mockTimestamp = 1609459200000; // milliseconds
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const message = { title: 'Test' };
      const result = strategyWithSecret['buildMessage'](message, 'target');

      // Timestamp should be in seconds (10 digits), not milliseconds (13 digits)
      expect(result.timestamp).toBe('1609459200');
      expect(result.timestamp?.length).toBe(10);
    });
  });

  describe('Response Parsing', () => {
    describe('New Format (code/msg)', () => {
      it('should parse success response', () => {
        const response = { code: 0, msg: 'success', data: { message_id: 'msg123' } };
        const result = strategy['parseResponse'](response);

        expect(result).toEqual({
          success: true,
          msgId: 'msg123',
        });
      });

      it('should parse success response without message_id', () => {
        const response = { code: 0, msg: 'success' };
        const result = strategy['parseResponse'](response);

        expect(result).toEqual({
          success: true,
          msgId: undefined,
        });
      });

      it('should parse error response with signature failure', () => {
        const response = { code: 19021, msg: 'sign verification failed' };
        const result = strategy['parseResponse'](response);

        expect(result).toEqual({
          success: false,
          error: 'sign verification failed',
          errorCode: 19021,
        });
      });

      it('should parse error response with rate limit', () => {
        const response = { code: 11232, msg: 'rate limit exceeded' };
        const result = strategy['parseResponse'](response);

        expect(result).toEqual({
          success: false,
          error: 'rate limit exceeded',
          errorCode: 11232,
        });
      });

      it('should parse error response with invalid parameters', () => {
        const response = { code: 9499, msg: 'invalid parameters' };
        const result = strategy['parseResponse'](response);

        expect(result).toEqual({
          success: false,
          error: 'invalid parameters',
          errorCode: 9499,
        });
      });
    });

    describe('Legacy Format (errcode/errmsg)', () => {
      it('should parse success response', () => {
        const response = { errcode: 0, errmsg: 'ok' };
        const result = strategy['parseResponse'](response);

        expect(result).toEqual({
          success: true,
          msgId: undefined,
        });
      });

      it('should parse error response', () => {
        const response = { errcode: 19021, errmsg: 'sign verification failed' };
        const result = strategy['parseResponse'](response);

        expect(result).toEqual({
          success: false,
          error: 'sign verification failed',
          errorCode: 19021,
        });
      });
    });

    it('should throw error for unknown response format', () => {
      const response = { status: 'ok' }; // Neither code nor errcode

      expect(() => {
        strategy['parseResponse'](response);
      }).toThrow(/unknown.*response format/i);
    });
  });

  describe('Send Request', () => {
    it('should send POST request to webhook URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 0, msg: 'success' }),
      });
      global.fetch = mockFetch;

      const messageBody = { msg_type: 'text', content: { text: 'Test' } };
      await strategy['sendRequest']('', messageBody);

      expect(mockFetch).toHaveBeenCalledWith(
        mockChannel.config.webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBody),
        })
      );
    });

    it('should include signature in request body when configured', async () => {
      const channelWithSecret: Channel = {
        ...mockChannel,
        config: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
          secret: 'abcdef1234567890abcdef1234567890',
        },
      };
      const strategyWithSecret = new FeishuStrategy(channelWithSecret);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 0, msg: 'success' }),
      });
      global.fetch = mockFetch;

      const message = { title: 'Test' };
      const messageBody = strategyWithSecret['buildMessage'](message, 'target');
      await strategyWithSecret['sendRequest']('', messageBody);

      // Verify signature is in body, not URL
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.timestamp).toBeDefined();
      expect(callBody.sign).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });
      global.fetch = mockFetch;

      const messageBody = { msg_type: 'text', content: { text: 'Test' } };
      const result = await strategy['sendRequest']('', messageBody);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const messageBody = { msg_type: 'text', content: { text: 'Test' } };
      const result = await strategy['sendRequest']('', messageBody);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});
