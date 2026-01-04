import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateSendKey, isValidSendKey } from '@webhook-pusher/shared';

describe('AuthService', () => {
  describe('Property 6: SendKey Uniqueness', () => {
    it('all generated SendKeys should be unique', () => {
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 100 }), (count) => {
          const keys = Array.from({ length: count }, () => generateSendKey());
          return new Set(keys).size === keys.length;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: SendKey Format Compliance', () => {
    it('generated SendKey should be at least 32 characters', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const key = generateSendKey();
          return key.length >= 32;
        }),
        { numRuns: 100 }
      );
    });

    it('generated SendKey should be URL-safe', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const key = generateSendKey();
          return isValidSendKey(key);
        }),
        { numRuns: 100 }
      );
    });

    it('generated SendKey should only contain URL-safe characters', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const key = generateSendKey();
          return /^[A-Za-z0-9_-]+$/.test(key);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidSendKey', () => {
    it('should reject empty string', () => {
      expect(isValidSendKey('')).toBe(false);
    });

    it('should reject short strings', () => {
      expect(isValidSendKey('abc')).toBe(false);
      expect(isValidSendKey('a'.repeat(31))).toBe(false);
    });

    it('should accept valid 32+ char URL-safe strings', () => {
      expect(isValidSendKey('a'.repeat(32))).toBe(true);
      expect(isValidSendKey('abcdefghijklmnopqrstuvwxyz123456')).toBe(true);
    });

    it('should reject strings with invalid characters', () => {
      expect(isValidSendKey('a'.repeat(31) + '!')).toBe(false);
      expect(isValidSendKey('a'.repeat(31) + ' ')).toBe(false);
      expect(isValidSendKey('a'.repeat(31) + '/')).toBe(false);
    });
  });
});
