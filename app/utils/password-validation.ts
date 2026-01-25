/**
 * 密码验证工具函数
 * 用于前端密码复杂度验证和强度计算
 * 
 * @example
 * ```typescript
 * import { validatePasswordComplexity, checkPasswordComplexity } from '~/utils/password-validation';
 * 
 * // 验证密码复杂度
 * const result = validatePasswordComplexity('MyPassword123!');
 * if (result.valid) {
 *   console.log('密码强度:', result.strength); // 'medium' or 'strong'
 * } else {
 *   console.log('错误:', result.errors);
 * }
 * 
 * // 检查各项复杂度要求（用于实时UI反馈）
 * const checks = checkPasswordComplexity('MyPassword123!');
 * console.log('长度符合:', checks.length);
 * console.log('包含大写:', checks.uppercase);
 * console.log('包含小写:', checks.lowercase);
 * console.log('包含数字:', checks.number);
 * console.log('包含特殊字符:', checks.special);
 * ```
 */

import type {
  PasswordComplexityResult,
  PasswordValidationError,
  PasswordComplexityChecks,
} from '~/types/system';

/**
 * 密码复杂度要求常量
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

/**
 * 检查密码的各项复杂度要求
 * @param password - 待检查的密码
 * @returns 各项复杂度检查结果
 */
export function checkPasswordComplexity(password: string): PasswordComplexityChecks {
  return {
    length: password.length >= PASSWORD_REQUIREMENTS.minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  };
}

/**
 * 验证密码复杂度
 * @param password - 待验证的密码
 * @returns 验证结果，包含是否有效、错误列表和强度评级
 */
export function validatePasswordComplexity(password: string): PasswordComplexityResult {
  const errors: PasswordValidationError[] = [];

  // 检查长度
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push({
      code: 'PASSWORD_TOO_SHORT',
      message: `密码长度至少为 ${PASSWORD_REQUIREMENTS.minLength} 个字符`,
      field: 'newPassword',
    });
  }

  // 检查大写字母
  if (!/[A-Z]/.test(password)) {
    errors.push({
      code: 'PASSWORD_MISSING_UPPERCASE',
      message: '密码必须包含至少一个大写字母',
      field: 'newPassword',
    });
  }

  // 检查小写字母
  if (!/[a-z]/.test(password)) {
    errors.push({
      code: 'PASSWORD_MISSING_LOWERCASE',
      message: '密码必须包含至少一个小写字母',
      field: 'newPassword',
    });
  }

  // 检查数字
  if (!/[0-9]/.test(password)) {
    errors.push({
      code: 'PASSWORD_MISSING_NUMBER',
      message: '密码必须包含至少一个数字',
      field: 'newPassword',
    });
  }

  // 检查特殊字符
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push({
      code: 'PASSWORD_MISSING_SPECIAL',
      message: '密码必须包含至少一个特殊字符',
      field: 'newPassword',
    });
  }

  // 计算密码强度
  const strength = calculatePasswordStrength(password, errors.length === 0);

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * 计算密码强度
 * @param password - 待计算的密码
 * @param isValid - 密码是否符合所有复杂度要求
 * @returns 密码强度等级
 */
export function calculatePasswordStrength(
  password: string,
  isValid?: boolean
): 'weak' | 'medium' | 'strong' {
  // 如果未提供 isValid 参数，则进行完整验证
  if (isValid === undefined) {
    const validation = validatePasswordComplexity(password);
    isValid = validation.valid;
  }

  // 如果不符合基本要求，则为弱密码
  if (!isValid) {
    return 'weak';
  }

  // 如果长度超过 16 个字符，则为强密码
  if (password.length >= 16) {
    return 'strong';
  }

  // 否则为中等强度
  return 'medium';
}

/**
 * 检查两次密码输入是否一致
 * @param password - 第一次输入的密码
 * @param confirmPassword - 第二次输入的密码
 * @returns 是否一致
 */
export function checkPasswordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * 获取密码强度的显示文本
 * @param strength - 密码强度等级
 * @returns 显示文本
 */
export function getPasswordStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
  const textMap = {
    weak: '弱',
    medium: '中等',
    strong: '强',
  };
  return textMap[strength];
}

/**
 * 获取密码强度的颜色类名
 * @param strength - 密码强度等级
 * @returns Tailwind CSS 颜色类名
 */
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  const colorMap = {
    weak: 'text-red-500',
    medium: 'text-yellow-500',
    strong: 'text-green-500',
  };
  return colorMap[strength];
}

/**
 * 获取密码强度进度条的颜色类名
 * @param strength - 密码强度等级
 * @returns Tailwind CSS 背景颜色类名
 */
export function getPasswordStrengthBarColor(strength: 'weak' | 'medium' | 'strong'): string {
  const colorMap = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };
  return colorMap[strength];
}
