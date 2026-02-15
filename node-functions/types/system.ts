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
 * 重置令牌请求参数
 */
export interface ResetTokenRequest {
  newPassword?: string;      // 可选：用户自定义密码
  confirmPassword?: string;  // 可选：确认密码
}

/**
 * 重置令牌响应结果
 */
export interface ResetTokenResult {
  adminToken: string;        // 新的管理员令牌
  message: string;           // 提示信息
  isCustomPassword: boolean; // 是否为自定义密码
}
