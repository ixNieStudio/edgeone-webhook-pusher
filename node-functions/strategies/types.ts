/**
 * 策略模式核心类型定义
 */

/**
 * 渠道能力类型
 */
export enum ChannelCapability {
  TOKEN_MANAGED = 'token_managed',  // Token 管理型（微信、企业微信）
  WEBHOOK = 'webhook',               // Webhook 型（钉钉、飞书）
}

/**
 * 推送消息输入
 */
export interface PushMessage {
  title: string;
  desp?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

/**
 * 发送结果
 */
export interface SendResult {
  success: boolean;
  msgId?: string;
  error?: string;
  errorCode?: number;
}

/**
 * 投递结果
 */
export interface DeliveryResult {
  openId: string;
  success: boolean;
  msgId?: string;
  error?: string;
}

/**
 * 推送结果
 */
export interface PushResult {
  pushId: string;
  total: number;
  success: number;
  failed: number;
  results: DeliveryResult[];
}
