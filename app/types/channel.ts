/**
 * Channel 渠道相关类型定义
 */

export type ChannelType = 'wechat' | 'work_wechat' | 'dingtalk' | 'feishu';

export interface WeChatConfig {
  appId: string;
  appSecret: string;
  msgToken?: string;  // 消息回调 Token
}

export interface WorkWeChatConfig {
  corpId: string;        // 企业ID
  agentId: number;       // 应用ID
  corpSecret: string;    // 应用密钥
}

export interface WebhookConfig {
  webhookUrl: string;    // Webhook URL
  secret?: string;       // 签名密钥（可选）
}

// 联合类型配置（用于类型安全）
export type ChannelConfig = WeChatConfig | WorkWeChatConfig | WebhookConfig;

// 兼容性配置接口（用于前端组件访问，包含所有可能的字段）
export interface ChannelConfigCompat {
  // WeChat 字段
  appId?: string;
  appSecret?: string;
  msgToken?: string;
  // WorkWeChat 字段
  corpId?: string;
  agentId?: number;
  corpSecret?: string;
  // Webhook 字段
  webhookUrl?: string;
  secret?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  config: ChannelConfig & ChannelConfigCompat;  // 使用交叉类型以支持所有字段访问
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelInput {
  name: string;
  type?: ChannelType;
  config: ChannelConfig;
}

export interface UpdateChannelInput {
  name?: string;
  config?: Partial<ChannelConfig>;
}
