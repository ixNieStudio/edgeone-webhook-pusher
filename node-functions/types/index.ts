/**
 * TypeScript 类型定义 - 统一导出
 */

// Channel 渠道
export * from './channel';

// App 应用
export * from './app';

// OpenID 订阅者
export * from './openid';

// BindCode 绑定码
export * from './bindcode';

// Message 消息
export * from './message';

// System 系统配置
export * from './system';

// API 响应、错误码、错误类
export * from './api';

// 常量定义
export * from './constants';

// ============ 密码错误码枚举 ============

/**
 * 密码验证错误码
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
