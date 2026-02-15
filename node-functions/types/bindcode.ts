/**
 * BindCode 绑定码相关类型定义
 */

export type BindCodeStatus = 'pending' | 'bound' | 'expired';

export interface BindCode {
  code: string;         // 绑定码（8位：4字母+4数字，如 ABCD1234）
  appId: string;        // 目标应用 ID
  channelId: string;    // 渠道 ID
  status: BindCodeStatus;
  openId?: string;      // 绑定的用户 OpenID
  nickname?: string;    // 绑定的用户昵称
  avatar?: string;      // 绑定的用户头像
  createdAt: number;    // 创建时间戳（毫秒）
  expiresAt: number;    // 过期时间戳（毫秒）
  qrCodeUrl?: string;   // 二维码图片 URL（仅认证服务号）
  qrCodeTicket?: string; // 二维码 ticket
}

export interface CreateBindCodeInput {
  appId: string;
  channelId: string;
}

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

// 绑定码有效期（毫秒）
export const BINDCODE_TTL_MS = 5 * 60 * 1000; // 5 分钟
