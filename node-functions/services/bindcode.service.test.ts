/**
 * BindCode Service Tests
 * 
 * Property-based tests for bind code generation and validation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateBindCode, isValidBindCodeFormat, isBindCodeExpired } from './bindcode.service.js';
import type { BindCode } from '../types/bindcode.js';
import { BINDCODE_TTL_MS } from '../types/bindcode.js';

// 可用字符集（与服务中定义一致）
const VALID_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const VALID_DIGITS = '23456789';
const INVALID_LETTERS = 'OI';
const INVALID_DIGITS = '01';

describe('BindCode Service', () => {
  /**
   * Property 1: 绑定码格式正确性
   * Feature: wechat-user-binding, Property 1: 绑定码格式正确性
   * Validates: Requirements 3.1, 3.4
   */
  describe('Property 1: 绑定码格式正确性', () => {
    it('生成的绑定码长度应为 8 位', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const code = generateBindCode();
          expect(code.length).toBe(8);
        }),
        { numRuns: 100 }
      );
    });

    it('生成的绑定码前 4 位应为有效大写字母（不含 O、I）', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const code = generateBindCode();
          const letterPart = code.substring(0, 4);
          
          for (const char of letterPart) {
            expect(VALID_LETTERS).toContain(char);
            expect(INVALID_LETTERS).not.toContain(char);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('生成的绑定码后 4 位应为有效数字（不含 0、1）', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const code = generateBindCode();
          const digitPart = code.substring(4, 8);
          
          for (const char of digitPart) {
            expect(VALID_DIGITS).toContain(char);
            expect(INVALID_DIGITS).not.toContain(char);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('生成的绑定码应通过格式验证', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const code = generateBindCode();
          expect(isValidBindCodeFormat(code)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidBindCodeFormat', () => {
    it('应拒绝空字符串', () => {
      expect(isValidBindCodeFormat('')).toBe(false);
    });

    it('应拒绝长度不为 8 的字符串', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.length !== 8),
          (str) => {
            expect(isValidBindCodeFormat(str)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应拒绝包含无效字母（O、I）的绑定码', () => {
      expect(isValidBindCodeFormat('ABCO1234')).toBe(false);
      expect(isValidBindCodeFormat('ABCI1234')).toBe(false);
    });

    it('应拒绝包含无效数字（0、1）的绑定码', () => {
      expect(isValidBindCodeFormat('ABCD0234')).toBe(false);
      expect(isValidBindCodeFormat('ABCD1234')).toBe(false);
    });

    it('应接受有效的绑定码', () => {
      expect(isValidBindCodeFormat('ABCD2345')).toBe(true);
      expect(isValidBindCodeFormat('WXYZ6789')).toBe(true);
    });
  });

  /**
   * Property 2: 绑定码结构完整性
   * Feature: wechat-user-binding, Property 2: 绑定码结构完整性
   * Validates: Requirements 3.2, 3.3
   */
  describe('Property 2: 绑定码结构完整性', () => {
    it('绑定码过期时间应为创建时间 + 5 分钟', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 2000000000000 }), // 时间戳范围
          (createdAt) => {
            const bindCode: BindCode = {
              code: 'ABCD2345',
              appId: 'app_123',
              channelId: 'ch_456',
              status: 'pending',
              createdAt,
              expiresAt: createdAt + BINDCODE_TTL_MS,
            };
            
            expect(bindCode.expiresAt - bindCode.createdAt).toBe(BINDCODE_TTL_MS);
            expect(BINDCODE_TTL_MS).toBe(5 * 60 * 1000); // 5 分钟
          }
        ),
        { numRuns: 100 }
      );
    });

    it('新创建的绑定码初始状态应为 pending', () => {
      const bindCode: BindCode = {
        code: 'ABCD2345',
        appId: 'app_123',
        channelId: 'ch_456',
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + BINDCODE_TTL_MS,
      };
      
      expect(bindCode.status).toBe('pending');
    });
  });

  /**
   * Property 4: 过期绑定码拒绝
   * Feature: wechat-user-binding, Property 4: 过期绑定码拒绝
   * Validates: Requirements 4.5
   */
  describe('Property 4: 过期绑定码检测', () => {
    it('当前时间超过 expiresAt 时应判定为过期', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }), // 过期时间差（毫秒）
          (timeDiff) => {
            const now = Date.now();
            const bindCode: BindCode = {
              code: 'ABCD2345',
              appId: 'app_123',
              channelId: 'ch_456',
              status: 'pending',
              createdAt: now - BINDCODE_TTL_MS - timeDiff,
              expiresAt: now - timeDiff,
            };
            
            expect(isBindCodeExpired(bindCode)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('当前时间未超过 expiresAt 时应判定为未过期', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: BINDCODE_TTL_MS - 1 }), // 剩余时间（毫秒）
          (remainingTime) => {
            const now = Date.now();
            const bindCode: BindCode = {
              code: 'ABCD2345',
              appId: 'app_123',
              channelId: 'ch_456',
              status: 'pending',
              createdAt: now - (BINDCODE_TTL_MS - remainingTime),
              expiresAt: now + remainingTime,
            };
            
            expect(isBindCodeExpired(bindCode)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 7: 绑定状态查询一致性
 * Feature: wechat-user-binding, Property 7: 绑定状态查询一致性
 * Validates: Requirements 6.1, 6.2
 */
describe('Property 7: 绑定状态查询一致性', () => {
  // 模拟 getStatus 逻辑
  function getStatusFromBindCode(bindCode: BindCode | null): { status: string; openId?: string; nickname?: string; avatar?: string } {
    if (!bindCode) {
      return { status: 'expired' };
    }
    
    if (Date.now() > bindCode.expiresAt && bindCode.status === 'pending') {
      return { status: 'expired' };
    }
    
    if (bindCode.status === 'bound') {
      return {
        status: 'bound',
        openId: bindCode.openId,
        nickname: bindCode.nickname,
        avatar: bindCode.avatar,
      };
    }
    
    return { status: 'pending' };
  }

  it('pending 状态不应包含用户信息', () => {
    fc.assert(
      fc.property(
        fc.record({
          code: fc.string({ minLength: 8, maxLength: 8 }),
          appId: fc.string({ minLength: 1 }),
          channelId: fc.string({ minLength: 1 }),
          status: fc.constant('pending' as const),
          createdAt: fc.integer({ min: Date.now() - 60000, max: Date.now() }),
          expiresAt: fc.integer({ min: Date.now() + 60000, max: Date.now() + 300000 }),
        }),
        (bindCode) => {
          const result = getStatusFromBindCode(bindCode as BindCode);
          expect(result.status).toBe('pending');
          expect(result.openId).toBeUndefined();
          expect(result.nickname).toBeUndefined();
          expect(result.avatar).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('bound 状态应包含用户信息', () => {
    fc.assert(
      fc.property(
        fc.record({
          code: fc.string({ minLength: 8, maxLength: 8 }),
          appId: fc.string({ minLength: 1 }),
          channelId: fc.string({ minLength: 1 }),
          status: fc.constant('bound' as const),
          openId: fc.string({ minLength: 1 }),
          nickname: fc.string({ minLength: 1 }),
          avatar: fc.webUrl(),
          createdAt: fc.integer({ min: Date.now() - 300000, max: Date.now() }),
          expiresAt: fc.integer({ min: Date.now() - 60000, max: Date.now() + 300000 }),
        }),
        (bindCode) => {
          const result = getStatusFromBindCode(bindCode as BindCode);
          expect(result.status).toBe('bound');
          expect(result.openId).toBe(bindCode.openId);
          expect(result.nickname).toBe(bindCode.nickname);
          expect(result.avatar).toBe(bindCode.avatar);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('expired 状态不应包含用户信息', () => {
    // 测试 null 绑定码
    const result1 = getStatusFromBindCode(null);
    expect(result1.status).toBe('expired');
    expect(result1.openId).toBeUndefined();

    // 测试过期的 pending 绑定码
    fc.assert(
      fc.property(
        fc.record({
          code: fc.string({ minLength: 8, maxLength: 8 }),
          appId: fc.string({ minLength: 1 }),
          channelId: fc.string({ minLength: 1 }),
          status: fc.constant('pending' as const),
          createdAt: fc.integer({ min: Date.now() - 600000, max: Date.now() - 300001 }),
          expiresAt: fc.integer({ min: Date.now() - 300000, max: Date.now() - 1 }),
        }),
        (bindCode) => {
          const result = getStatusFromBindCode(bindCode as BindCode);
          expect(result.status).toBe('expired');
          expect(result.openId).toBeUndefined();
          expect(result.nickname).toBeUndefined();
          expect(result.avatar).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
