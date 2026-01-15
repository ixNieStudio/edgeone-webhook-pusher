/**
 * System 系统配置相关类型定义
 */

export interface SystemConfig {
  adminToken: string;
  wechat?: {
    appId: string;
    appSecret: string;
    templateId?: string;
  };
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
