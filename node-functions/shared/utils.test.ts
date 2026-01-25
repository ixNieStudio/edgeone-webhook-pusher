/**
 * 密码验证函数测试
 * 
 * 测试 validatePasswordFormat 函数的各种场景
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePasswordFormat } from './utils.js';

describe('validatePasswordFormat', () => {
  describe('单元测试 - 基本验证', () => {
    it('应该拒绝长度不足的密码', () => {
      expect(validatePasswordFormat('Short1!')).toBe(false);
      expect(validatePasswordFormat('Aa1!')).toBe(false);
      expect(validatePasswordFormat('12345678901')).toBe(false);
    });

    it('应该拒绝缺少大写字母的密码', () => {
      expect(validatePasswordFormat('lowercase123!')).toBe(false);
      expect(validatePasswordFormat('alllowercase1234!')).toBe(false);
    });

    it('应该拒绝缺少小写字母的密码', () => {
      expect(validatePasswordFormat('UPPERCASE123!')).toBe(false);
      expect(validatePasswordFormat('ALLUPPERCASE1234!')).toBe(false);
    });

    it('应该拒绝缺少数字的密码', () => {
      expect(validatePasswordFormat('NoNumbers!Abc')).toBe(false);
      expect(validatePasswordFormat('OnlyLetters!@#ABC')).toBe(false);
    });

    it('应该拒绝缺少特殊字符的密码', () => {
      expect(validatePasswordFormat('NoSpecial123Abc')).toBe(false);
      expect(validatePasswordFormat('AlsoNoSpecial456Xyz')).toBe(false);
    });

    it('应该接受符合所有要求的密码', () => {
      expect(validatePasswordFormat('ValidPass123!')).toBe(true);
      expect(validatePasswordFormat('MySecure@Pass1')).toBe(true);
      expect(validatePasswordFormat('Complex#Pass99')).toBe(true);
    });

    it('应该接受包含所有特殊字符的密码', () => {
      expect(validatePasswordFormat('Test123!@#$%')).toBe(true);
      expect(validatePasswordFormat('Pass^&*()_+Aa1')).toBe(true);
      expect(validatePasswordFormat('Valid-=[]{}Aa1')).toBe(true);
      expect(validatePasswordFormat('Good|;:,.<>?Aa1')).toBe(true);
    });

    it('应该接受恰好12个字符的有效密码', () => {
      expect(validatePasswordFormat('ValidPass1!a')).toBe(true);
    });

    it('应该接受超长的有效密码', () => {
      expect(validatePasswordFormat('VeryLongPassword123!@#WithManyCharacters')).toBe(true);
    });
  });

  describe('单元测试 - 边界情况', () => {
    it('应该拒绝空字符串', () => {
      expect(validatePasswordFormat('')).toBe(false);
    });

    it('应该拒绝null或undefined', () => {
      expect(validatePasswordFormat(null as any)).toBe(false);
      expect(validatePasswordFormat(undefined as any)).toBe(false);
    });

    it('应该拒绝只有空格的密码', () => {
      expect(validatePasswordFormat('            ')).toBe(false);
    });

    it('应该接受包含空格的有效密码', () => {
      // 空格不是特殊字符，所以需要其他特殊字符
      expect(validatePasswordFormat('Valid Pass 1!')).toBe(true);
    });

    it('应该拒绝只包含一种字符类型的密码', () => {
      expect(validatePasswordFormat('aaaaaaaaaaaaa')).toBe(false);
      expect(validatePasswordFormat('AAAAAAAAAAAAA')).toBe(false);
      expect(validatePasswordFormat('1111111111111')).toBe(false);
      expect(validatePasswordFormat('!!!!!!!!!!!!!!')).toBe(false);
    });
  });

  describe('属性测试 - 密码复杂度验证完整性', () => {
    /**
     * Property 1: 密码格式验证正确性
     * 对于任何输入的密码字符串，验证函数必须检查所有复杂度要求
     * 
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
     */
    it('应该正确验证所有复杂度要求', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const result = validatePasswordFormat(password);
          
          // 处理空字符串和null的情况
          if (!password) {
            expect(result).toBe(false);
            return;
          }
          
          const hasLength = password.length >= 12;
          const hasUppercase = /[A-Z]/.test(password);
          const hasLowercase = /[a-z]/.test(password);
          const hasNumber = /[0-9]/.test(password);
          const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
          
          const shouldBeValid = hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
          
          expect(result).toBe(shouldBeValid);
        }),
        { numRuns: 200 }
      );
    });

    /**
     * Property 2: 有效密码必须满足所有条件
     * 如果函数返回 true，则密码必须满足所有复杂度要求
     */
    it('返回true时密码必须满足所有要求', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const result = validatePasswordFormat(password);
          
          if (result === true) {
            expect(password.length).toBeGreaterThanOrEqual(12);
            expect(/[A-Z]/.test(password)).toBe(true);
            expect(/[a-z]/.test(password)).toBe(true);
            expect(/[0-9]/.test(password)).toBe(true);
            expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
          }
        }),
        { numRuns: 200 }
      );
    });

    /**
     * Property 3: 无效密码至少缺少一个条件
     * 如果函数返回 false，则密码至少缺少一个复杂度要求
     */
    it('返回false时密码至少缺少一个要求', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const result = validatePasswordFormat(password);
          
          if (result === false) {
            // 处理空字符串的情况
            if (!password) {
              expect(result).toBe(false);
              return;
            }
            
            const hasLength = password.length >= 12;
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
            
            const allConditionsMet = hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
            expect(allConditionsMet).toBe(false);
          }
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('属性测试 - 生成有效密码', () => {
    /**
     * 生成符合所有要求的密码
     */
    const validPasswordArbitrary = fc.tuple(
      fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 1, maxLength: 5 }),
      fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 5 }),
      fc.array(fc.constantFrom(...'0123456789'.split('')), { minLength: 1, maxLength: 5 }),
      fc.array(fc.constantFrom(...'!@#$%^&*()_+-=[]{}|;:,.<>?'.split('')), { minLength: 1, maxLength: 5 }),
      fc.string({ minLength: 0, maxLength: 10 })
    ).map(([upper, lower, digit, special, extra]) => {
      // 组合所有部分并打乱顺序
      const combined = (upper.join('') + lower.join('') + digit.join('') + special.join('') + extra).split('');
      // 简单的打乱算法
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
      let password = combined.join('');
      
      // 确保长度至少为12
      while (password.length < 12) {
        password += 'Aa1!';
      }
      
      return password;
    });

    /**
     * Property 4: 生成的有效密码应该通过验证
     * 使用智能生成器生成的密码应该都能通过验证
     */
    it('智能生成的有效密码应该通过验证', () => {
      fc.assert(
        fc.property(validPasswordArbitrary, (password) => {
          const result = validatePasswordFormat(password);
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('属性测试 - 特殊字符支持', () => {
    /**
     * Property 5: 所有支持的特殊字符都应该被识别
     */
    it('应该识别所有支持的特殊字符', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'.split('');
      
      fc.assert(
        fc.property(
          fc.constantFrom(...specialChars),
          (specialChar) => {
            // 构造一个包含该特殊字符的有效密码（至少12个字符，包含大小写字母和数字）
            const password = `ValidPass123${specialChar}`;
            const result = validatePasswordFormat(password);
            expect(result).toBe(true);
          }
        ),
        { numRuns: specialChars.length }
      );
    });
  });

  describe('属性测试 - 幂等性', () => {
    /**
     * Property 6: 验证函数应该是幂等的
     * 对同一个密码多次调用应该返回相同的结果
     */
    it('对同一密码多次验证应返回相同结果', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const result1 = validatePasswordFormat(password);
          const result2 = validatePasswordFormat(password);
          const result3 = validatePasswordFormat(password);
          
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }),
        { numRuns: 100 }
      );
    });
  });
});
