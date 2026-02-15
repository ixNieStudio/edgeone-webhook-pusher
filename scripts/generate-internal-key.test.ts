/**
 * 密钥生成属性测试
 * 
 * Property 1: Key Format Validity
 * For any generated key, it SHALL be exactly 64 characters long
 * and contain only hexadecimal characters (0-9, a-f).
 * 
 * Validates: Requirements 1.1, 4.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateKey, isValidKeyFormat } from './generate-internal-key.js';

describe('Internal Key Generation', () => {
  /**
   * Property 1: Key Format Validity
   * Feature: kv-api-security, Property 1: Key Format Validity
   */
  describe('Property 1: Key Format Validity', () => {
    it('should generate keys with exactly 64 hexadecimal characters', () => {
      // 生成 100 个密钥，验证全部符合格式要求
      fc.assert(
        fc.property(fc.constant(null), () => {
          const key = generateKey();
          
          // 验证长度为 64
          expect(key.length).toBe(64);
          
          // 验证只包含十六进制字符
          expect(key).toMatch(/^[0-9a-f]{64}$/);
          
          // 验证格式验证函数
          expect(isValidKeyFormat(key)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      
      fc.assert(
        fc.property(fc.constant(null), () => {
          const key = generateKey();
          
          // 验证密钥唯一（极低概率重复）
          expect(keys.has(key)).toBe(false);
          keys.add(key);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidKeyFormat', () => {
    // 生成十六进制字符串的 arbitrary
    const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
    const hexString64 = fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(arr => arr.join(''));
    const hexStringAny = fc.array(hexChar, { minLength: 0, maxLength: 100 }).map(arr => arr.join(''));

    it('should accept valid 64-char hex keys', () => {
      fc.assert(
        fc.property(hexString64, (key) => {
          expect(isValidKeyFormat(key)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject keys with wrong length', () => {
      fc.assert(
        fc.property(
          hexStringAny.filter(s => s.length !== 64),
          (key) => {
            expect(isValidKeyFormat(key)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject keys with non-hex characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 64, maxLength: 64 }).filter(s => !/^[0-9a-fA-F]+$/.test(s)),
          (key) => {
            expect(isValidKeyFormat(key)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
