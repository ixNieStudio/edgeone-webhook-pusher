/**
 * Edge Functions 认证属性测试
 * 
 * Property 2: Invalid Key Rejection
 * For any request to KV API with an invalid or missing X-Internal-Key header,
 * the Edge Function SHALL return HTTP 403 status.
 * 
 * Property 3: Valid Key Acceptance
 * For any request to KV API with a valid X-Internal-Key header,
 * the Edge Function SHALL process the request normally (not return 403).
 * 
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 4.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// 模拟 Edge Functions 中的 isValidKey 函数
function isValidKey(key: string | null, env: { INTERNAL_DEBUG_KEY?: string }, buildKey: string): boolean {
  if (!key) return false;

  // Build Key 验证
  if (key === buildKey) return true;

  // Debug Key 验证（如果配置）
  const debugKey = env?.INTERNAL_DEBUG_KEY;
  if (debugKey && debugKey.length === 64 && key === debugKey) return true;

  return false;
}

// 生成有效的 64 字符十六进制密钥
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
const validKey = fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(arr => arr.join(''));

// 生成无效密钥（长度不对或包含非十六进制字符）
const invalidKey = fc.oneof(
  // 长度不对
  fc.array(hexChar, { minLength: 0, maxLength: 63 }).map(arr => arr.join('')),
  fc.array(hexChar, { minLength: 65, maxLength: 100 }).map(arr => arr.join('')),
  // 包含非十六进制字符
  fc.string({ minLength: 64, maxLength: 64 }).filter(s => !/^[0-9a-f]{64}$/.test(s))
);

describe('Edge Functions Authentication', () => {
  /**
   * Property 2: Invalid Key Rejection
   * Feature: kv-api-security, Property 2: Invalid Key Rejection
   */
  describe('Property 2: Invalid Key Rejection', () => {
    it('should reject requests with null key', () => {
      fc.assert(
        fc.property(validKey, (buildKey) => {
          const result = isValidKey(null, {}, buildKey);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject requests with empty string key', () => {
      fc.assert(
        fc.property(validKey, (buildKey) => {
          const result = isValidKey('', {}, buildKey);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject requests with random invalid keys', () => {
      fc.assert(
        fc.property(validKey, invalidKey, (buildKey, randomKey) => {
          // 确保随机密钥不等于 buildKey
          if (randomKey === buildKey) return;
          
          const result = isValidKey(randomKey, {}, buildKey);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject requests with wrong valid-format keys', () => {
      fc.assert(
        fc.property(validKey, validKey, (buildKey, wrongKey) => {
          // 确保两个密钥不同
          if (wrongKey === buildKey) return;
          
          const result = isValidKey(wrongKey, {}, buildKey);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Valid Key Acceptance
   * Feature: kv-api-security, Property 3: Valid Key Acceptance
   */
  describe('Property 3: Valid Key Acceptance', () => {
    it('should accept requests with correct build key', () => {
      fc.assert(
        fc.property(validKey, (buildKey) => {
          const result = isValidKey(buildKey, {}, buildKey);
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept requests with correct debug key', () => {
      fc.assert(
        fc.property(validKey, validKey, (buildKey, debugKey) => {
          const env = { INTERNAL_DEBUG_KEY: debugKey };
          const result = isValidKey(debugKey, env, buildKey);
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept either build key or debug key when both configured', () => {
      fc.assert(
        fc.property(validKey, validKey, fc.boolean(), (buildKey, debugKey, useBuildKey) => {
          const env = { INTERNAL_DEBUG_KEY: debugKey };
          const keyToUse = useBuildKey ? buildKey : debugKey;
          const result = isValidKey(keyToUse, env, buildKey);
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Debug Key Format Validation', () => {
    it('should ignore debug key with wrong length', () => {
      fc.assert(
        fc.property(
          validKey,
          fc.array(hexChar, { minLength: 1, maxLength: 63 }).map(arr => arr.join('')),
          (buildKey, shortDebugKey) => {
            const env = { INTERNAL_DEBUG_KEY: shortDebugKey };
            // 使用短的 debug key 应该失败
            const result = isValidKey(shortDebugKey, env, buildKey);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
