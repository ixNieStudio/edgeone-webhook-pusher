/**
 * BindCode 绑定码相关类型定义
 * 与后端 node-functions/types/bindcode.ts 保持一致
 */

export type BindCodeStatus = 'pending' | 'bound' | 'expired';

export interface CreateBindCodeResponse {
  bindCode: string;     // 绑定码
  expiresAt: number;    // 过期时间戳
  qrCodeUrl?: string;   // 二维码图片 URL（仅认证服务号）
}

export interface BindCodeStatusResponse {
  status: BindCodeStatus;
  openId?: string;
  nickname?: string;
  avatar?: string;
}
