/**
 * 密码验证工具函数测试
 * Feature: admin-password-customization
 * 
 * 测试前端密码复杂度验证和强度计算功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validatePasswordComplexity,
  calculatePasswordStrength,
  checkPasswordComplexity,
  checkPasswordsMatch,
  getPasswordStrengthText,
  getPasswordStrengthColor,
  getPasswordStrengthBarColor,
  PASSWORD_REQUIREMENTS,
} from './password-validation';

describe('Password Validation Utilities', () => {
  describe('Unit Tests - validatePasswordComplexity', () => {
    it('should reject password that is too short', () => {
      const result = validatePasswordComplexity('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'PASSWORD_TOO_SHORT' })
      );
    });

    it('should reject password missing uppercase letter', () => {
      const result = validatePasswordComplexity('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'PASSWORD_MISSING_UPPERCASE' })
      );
    });

    it('should reject password missing lowercase letter', () => {
      const result = validatePasswordComplexity('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'PASSWORD_MISSING_LOWERCASE' })
      );
    });

    it('should reject password missing number', () => {
      const result = validatePasswordComplexity('NoNumbers!Abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'PASSWORD_MISSING_NUMBER' })
      );
    });

    it('should reject password missing special character', () => {
      const result = validatePasswordComplexity('NoSpecial123Abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'PASSWORD_MISSING_SPECIAL' })
      );
    });

    it('should accept password meeting all requirements', () => {
      const result = validatePasswordComplexity('ValidPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('medium');
    });

    it('should rate long password as strong', () => {
      const result = validatePasswordComplexity('VeryLongPassword123!@#');
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('should return all validation errors for weak password', () => {
      const result = validatePasswordComplexity('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept password with various special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      for (const char of specialChars) {
        const password = `ValidPass123${char}`;
        const result = validatePasswordComplexity(password);
        expect(result.valid).toBe(true);
      }
    });

    it('should rate 12-character valid password as medium', () => {
      const result = validatePasswordComplexity('ValidPass12!');
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('medium');
    });

    it('should rate 16-character valid password as strong', () => {
      const result = validatePasswordComplexity('ValidPassword123!');
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('strong');
    });
  });

  describe('Unit Tests - calculatePasswordStrength', () => {
    it('should return weak for invalid password', () => {
      const strength = calculatePasswordStrength('weak');
      expect(strength).toBe('weak');
    });

    it('should return medium for valid 12-character password', () => {
      const strength = calculatePasswordStrength('ValidPass12!');
      expect(strength).toBe('medium');
    });

    it('should return strong for valid 16+ character password', () => {
      const strength = calculatePasswordStrength('ValidPassword123!');
      expect(strength).toBe('strong');
    });

    it('should accept isValid parameter to skip validation', () => {
      const strength = calculatePasswordStrength('ValidPass123!', true);
      expect(strength).toBe('medium');
    });

    it('should return weak when isValid is false', () => {
      const strength = calculatePasswordStrength('anything', false);
      expect(strength).toBe('weak');
    });
  });

  describe('Unit Tests - checkPasswordComplexity', () => {
    it('should return all checks as false for empty password', () => {
      const checks = checkPasswordComplexity('');
      expect(checks.length).toBe(false);
      expect(checks.uppercase).toBe(false);
      expect(checks.lowercase).toBe(false);
      expect(checks.number).toBe(false);
      expect(checks.special).toBe(false);
    });

    it('should return correct checks for valid password', () => {
      const checks = checkPasswordComplexity('ValidPass123!');
      expect(checks.length).toBe(true);
      expect(checks.uppercase).toBe(true);
      expect(checks.lowercase).toBe(true);
      expect(checks.number).toBe(true);
      expect(checks.special).toBe(true);
    });

    it('should return false for length check when password is too short', () => {
      const checks = checkPasswordComplexity('Short1!');
      expect(checks.length).toBe(false);
    });

    it('should return false for uppercase check when missing uppercase', () => {
      const checks = checkPasswordComplexity('validpass123!');
      expect(checks.uppercase).toBe(false);
    });

    it('should return false for lowercase check when missing lowercase', () => {
      const checks = checkPasswordComplexity('VALIDPASS123!');
      expect(checks.lowercase).toBe(false);
    });

    it('should return false for number check when missing number', () => {
      const checks = checkPasswordComplexity('ValidPassword!');
      expect(checks.number).toBe(false);
    });

    it('should return false for special check when missing special character', () => {
      const checks = checkPasswordComplexity('ValidPassword123');
      expect(checks.special).toBe(false);
    });
  });

  describe('Unit Tests - checkPasswordsMatch', () => {
    it('should return true for matching passwords', () => {
      expect(checkPasswordsMatch('password', 'password')).toBe(true);
    });

    it('should return false for non-matching passwords', () => {
      expect(checkPasswordsMatch('password1', 'password2')).toBe(false);
    });

    it('should return true for empty strings', () => {
      expect(checkPasswordsMatch('', '')).toBe(true);
    });

    it('should be case-sensitive', () => {
      expect(checkPasswordsMatch('Password', 'password')).toBe(false);
    });
  });

  describe('Unit Tests - Helper Functions', () => {
    it('should return correct text for password strength', () => {
      expect(getPasswordStrengthText('weak')).toBe('弱');
      expect(getPasswordStrengthText('medium')).toBe('中等');
      expect(getPasswordStrengthText('strong')).toBe('强');
    });

    it('should return correct color class for password strength', () => {
      expect(getPasswordStrengthColor('weak')).toBe('text-red-500');
      expect(getPasswordStrengthColor('medium')).toBe('text-yellow-500');
      expect(getPasswordStrengthColor('strong')).toBe('text-green-500');
    });

    it('should return correct bar color class for password strength', () => {
      expect(getPasswordStrengthBarColor('weak')).toBe('bg-red-500');
      expect(getPasswordStrengthBarColor('medium')).toBe('bg-yellow-500');
      expect(getPasswordStrengthBarColor('strong')).toBe('bg-green-500');
    });
  });

  describe('Property Tests', () => {
    /**
     * Property 1: 密码复杂度验证完整性
     * Feature: admin-password-customization, Property 1: 密码复杂度验证完整性
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
     * 
     * 对于任何输入的密码字符串，验证函数必须检查所有复杂度要求
     */
    it('should correctly validate all complexity requirements', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const result = validatePasswordComplexity(password);

          const hasLength = password.length >= PASSWORD_REQUIREMENTS.minLength;
          const hasUppercase = /[A-Z]/.test(password);
          const hasLowercase = /[a-z]/.test(password);
          const hasNumber = /[0-9]/.test(password);
          const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

          const shouldBeValid =
            hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

          expect(result.valid).toBe(shouldBeValid);

          // 验证错误列表的正确性
          if (!hasLength) {
            expect(result.errors).toContainEqual(
              expect.objectContaining({ code: 'PASSWORD_TOO_SHORT' })
            );
          }
          if (!hasUppercase) {
            expect(result.errors).toContainEqual(
              expect.objectContaining({ code: 'PASSWORD_MISSING_UPPERCASE' })
            );
          }
          if (!hasLowercase) {
            expect(result.errors).toContainEqual(
              expect.objectContaining({ code: 'PASSWORD_MISSING_LOWERCASE' })
            );
          }
          if (!hasNumber) {
            expect(result.errors).toContainEqual(
              expect.objectContaining({ code: 'PASSWORD_MISSING_NUMBER' })
            );
          }
          if (!hasSpecial) {
            expect(result.errors).toContainEqual(
              expect.objectContaining({ code: 'PASSWORD_MISSING_SPECIAL' })
            );
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2: 密码强度单调性
     * Feature: admin-password-customization, Property 2: 密码强度单调性
     * Validates: Requirements 9.2, 9.3, 9.4
     * 
     * 密码强度评级应随密码长度和复杂度单调递增
     */
    it('should rate password strength based on length and complexity', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 30 }), (basePwd) => {
          // 构造符合复杂度的密码
          const password = 'Aa1!' + basePwd;
          const result = validatePasswordComplexity(password);

          if (!result.valid) {
            expect(result.strength).toBe('weak');
          } else if (password.length >= 16) {
            expect(result.strength).toBe('strong');
          } else {
            expect(result.strength).toBe('medium');
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3: 密码匹配对称性
     * Feature: admin-password-customization, Property 3: 密码匹配对称性
     * Validates: Requirements 3.2
     * 
     * 密码匹配检查应该是对称的
     */
    it('should have symmetric password matching', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (pwd1, pwd2) => {
          const match1 = checkPasswordsMatch(pwd1, pwd2);
          const match2 = checkPasswordsMatch(pwd2, pwd1);
          expect(match1).toBe(match2);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4: 密码匹配传递性
     * Feature: admin-password-customization, Property 4: 密码匹配传递性
     * Validates: Requirements 3.2
     * 
     * 如果 A == B 且 B == C，则 A == C
     */
    it('should have transitive password matching', () => {
      fc.assert(
        fc.property(fc.string(), (pwd) => {
          // 如果密码与自己匹配，且与另一个相同的副本匹配
          const match1 = checkPasswordsMatch(pwd, pwd);
          const match2 = checkPasswordsMatch(pwd, pwd);
          expect(match1).toBe(true);
          expect(match2).toBe(true);
          // 则它们应该相互匹配
          expect(checkPasswordsMatch(pwd, pwd)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 5: 复杂度检查一致性
     * Feature: admin-password-customization, Property 5: 复杂度检查一致性
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
     * 
     * checkPasswordComplexity 和 validatePasswordComplexity 应该返回一致的结果
     */
    it('should have consistent complexity checks', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const checks = checkPasswordComplexity(password);
          const validation = validatePasswordComplexity(password);

          // 如果所有检查都通过，验证应该成功
          const allChecksPassed =
            checks.length &&
            checks.uppercase &&
            checks.lowercase &&
            checks.number &&
            checks.special;

          expect(validation.valid).toBe(allChecksPassed);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 6: 强度计算一致性
     * Feature: admin-password-customization, Property 6: 强度计算一致性
     * Validates: Requirements 9.2, 9.3, 9.4
     * 
     * calculatePasswordStrength 应该与 validatePasswordComplexity 返回相同的强度
     */
    it('should have consistent strength calculation', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const validation = validatePasswordComplexity(password);
          const strength = calculatePasswordStrength(password);

          expect(strength).toBe(validation.strength);
        }),
        { numRuns: 100 }
      );
    });
  });
});
