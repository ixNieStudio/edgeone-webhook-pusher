import { describe, it, expect } from 'vitest';
import { maskCredential, maskCredentials } from '@webhook-pusher/shared';

describe('ChannelService', () => {
  describe('Property 12: Credential Masking in Responses', () => {
    it('should mask short credentials completely', () => {
      expect(maskCredential('abc')).toBe('***');
      expect(maskCredential('12345678')).toBe('********');
    });

    it('should mask long credentials with visible ends', () => {
      const result = maskCredential('abcdefghijklmnop');
      expect(result.startsWith('abcd')).toBe(true);
      expect(result.endsWith('mnop')).toBe(true);
      expect(result.includes('*')).toBe(true);
    });

    it('should mask only sensitive fields', () => {
      const credentials = {
        appId: 'wx123456',
        appSecret: 'secret123456789012345678',
        templateId: 'template123',
      };

      const masked = maskCredentials(credentials, ['appSecret']);

      expect(masked.appId).toBe('wx123456');
      expect(masked.templateId).toBe('template123');
      expect(masked.appSecret).not.toBe('secret123456789012345678');
      expect(masked.appSecret.includes('*')).toBe(true);
    });

    it('should handle empty sensitive fields list', () => {
      const credentials = {
        appId: 'wx123456',
        appSecret: 'secret123',
      };

      const masked = maskCredentials(credentials, []);

      expect(masked.appId).toBe('wx123456');
      expect(masked.appSecret).toBe('secret123');
    });
  });

  describe('Property 9: Channel Credential Validation', () => {
    it('maskCredential should preserve length indication', () => {
      const short = maskCredential('abc');
      const long = maskCredential('abcdefghijklmnopqrstuvwxyz');

      expect(short.length).toBe(3);
      expect(long.length).toBe(26);
    });
  });
});
