/**
 * System 系统配置相关类型定义
 */

export interface SystemConfig {
  adminToken: string;
  rateLimit?: {
    perMinute: number;
  };
  retention?: {
    days: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 初始化状态
 */
export interface InitStatus {
  initialized: boolean;
}

/**
 * 初始化结果
 */
export interface InitResult {
  adminToken: string;
  message: string;
}

/**
 * Token 验证结果
 */
export interface ValidateTokenResult {
  valid: boolean;
}

/**
 * 重置令牌请求
 */
export interface ResetTokenRequest {
  newPassword?: string;      // 可选：用户自定义密码
  confirmPassword?: string;  // 可选：确认密码
}

/**
 * 重置令牌结果
 */
export interface ResetTokenResult {
  adminToken: string;
  message: string;
  isCustomPassword: boolean; // 是否为自定义密码
}

/**
 * 密码验证错误
 */
export interface PasswordValidationError {
  code: string;              // 错误码
  message: string;           // 错误消息
  field?: string;            // 相关字段
}

/**
 * 密码复杂度验证结果
 */
export interface PasswordComplexityResult {
  valid: boolean;                        // 是否有效
  errors: PasswordValidationError[];     // 错误列表
  strength?: 'weak' | 'medium' | 'strong'; // 密码强度
}

/**
 * 密码错误码枚举
 */
export enum PasswordErrorCodes {
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_MISSING_UPPERCASE = 'PASSWORD_MISSING_UPPERCASE',
  PASSWORD_MISSING_LOWERCASE = 'PASSWORD_MISSING_LOWERCASE',
  PASSWORD_MISSING_NUMBER = 'PASSWORD_MISSING_NUMBER',
  PASSWORD_MISSING_SPECIAL = 'PASSWORD_MISSING_SPECIAL',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  CONFIRMATION_REQUIRED = 'CONFIRMATION_REQUIRED',
}

/**
 * 密码复杂度检查结果
 */
export interface PasswordComplexityChecks {
  length: boolean;      // 长度至少 12 个字符
  uppercase: boolean;   // 包含大写字母
  lowercase: boolean;   // 包含小写字母
  number: boolean;      // 包含数字
  special: boolean;     // 包含特殊字符
}
