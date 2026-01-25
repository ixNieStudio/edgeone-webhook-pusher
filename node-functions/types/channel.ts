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

export type ChannelConfig = WeChatConfig | WorkWeChatConfig | WebhookConfig;

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  config: ChannelConfig;
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
