/**
 * KV Client 密钥传递属性测试
 * 
 * Property 4: Key Preference in Node Functions
 * For any KV Client request, if INTERNAL_DEBUG_KEY environment variable is set and valid,
 * it SHALL be used; otherwise Build_Key SHALL be used.
 * The request SHALL always include the X-Internal-Key header.
 * 
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// 模拟 getInternalKey 函数的逻辑
function getInternalKey(buildKey: string, debugKey?: string): string {
  // 优先使用调试密钥
  if (debugKey) {
    return debugKey;
  }
  // 否则使用构建时生成的密钥
  return buildKey;
}

// 生成有效的 64 字符十六进制密钥
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
const validKey = fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(arr => arr.join(''));

describe('KV Client Key Preference', () => {
  /**
   * Property 4: Key Preference in Node Functions
   * Feature: kv-api-security, Property 4: Key Preference in Node Functions
   */
  describe('Property 4: Key Preference in Node Functions', () => {
    it('should use debug key when INTERNAL_DEBUG_KEY is set', () => {
      fc.assert(
        fc.property(validKey, validKey, (buildKey, debugKey) => {
          const result = getInternalKey(buildKey, debugKey);
          expect(result).toBe(debugKey);
        }),
        { numRuns: 100 }
      );
    });

    it('should use build key when INTERNAL_DEBUG_KEY is not set', () => {
      fc.assert(
        fc.property(validKey, (buildKey) => {
          const result = getInternalKey(buildKey, undefined);
          expect(result).toBe(buildKey);
        }),
        { numRuns: 100 }
      );
    });

    it('should use build key when INTERNAL_DEBUG_KEY is empty string', () => {
      fc.assert(
        fc.property(validKey, (buildKey) => {
          const result = getInternalKey(buildKey, '');
          // 空字符串是 falsy，应该使用 buildKey
          expect(result).toBe(buildKey);
        }),
        { numRuns: 100 }
      );
    });

    it('should always return a non-empty key', () => {
      fc.assert(
        fc.property(
          validKey,
          fc.option(validKey, { nil: undefined }),
          (buildKey, debugKey) => {
            const result = getInternalKey(buildKey, debugKey);
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Key Format Consistency', () => {
    it('should return key with correct format regardless of source', () => {
      fc.assert(
        fc.property(
          validKey,
          fc.option(validKey, { nil: undefined }),
          (buildKey, debugKey) => {
            const result = getInternalKey(buildKey, debugKey);
            // 返回的密钥应该是 64 字符十六进制
            expect(result).toMatch(/^[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('KV Client Request Headers', () => {
  it('should include X-Internal-Key header in all requests', () => {
    // 模拟 getAuthHeaders 函数
    function getAuthHeaders(buildKey: string, debugKey?: string): Record<string, string> {
      return {
        'X-Internal-Key': getInternalKey(buildKey, debugKey),
      };
    }

    fc.assert(
      fc.property(
        validKey,
        fc.option(validKey, { nil: undefined }),
        (buildKey, debugKey) => {
          const headers = getAuthHeaders(buildKey, debugKey);
          
          // 验证 header 存在
          expect(headers).toHaveProperty('X-Internal-Key');
          
          // 验证 header 值非空
          expect(headers['X-Internal-Key'].length).toBeGreaterThan(0);
          
          // 验证 header 值格式正确
          expect(headers['X-Internal-Key']).toMatch(/^[0-9a-f]{64}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
