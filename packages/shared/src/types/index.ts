// Channel types - v1.0 only supports wechat-template
export type ChannelType = 'wechat-template';

// Push request/response
export interface PushRequest {
  title: string;
  desp?: string;
  channel?: string;
}

export interface PushResponse {
  code: number;
  message: string;
  data?: { pushId: string };
}

// User data
export interface UserData {
  id: string;
  sendKey: string;
  createdAt: string;
  rateLimit: {
    count: number;
    resetAt: string;
  };
}

// Channel data
export interface ChannelData {
  id: string;
  userId: string;
  type: ChannelType;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Message data
export interface MessageData {
  id: string;
  userId: string;
  title: string;
  content?: string;
  createdAt: string;
  deliveryResults: DeliveryResult[];
}

export interface DeliveryResult {
  channelId: string;
  channelType: ChannelType;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  externalId?: string;
}

// Channel adapter interface
export interface Message {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
}

export interface ChannelDeliveryResult {
  success: boolean;
  error?: string;
  externalId?: string;
}

export interface ConfigField {
  type: 'string';
  label: string;
  required: boolean;
  sensitive?: boolean;
}

export type ConfigSchema = Record<string, ConfigField>;

export interface ChannelAdapter {
  readonly type: ChannelType;
  readonly name: string;
  send(message: Message, credentials: Record<string, string>): Promise<ChannelDeliveryResult>;
  validate(credentials: Record<string, string>): Promise<boolean>;
  getConfigSchema(): ConfigSchema;
}

// WeChat Template specific config
export interface WeChatTemplateConfig {
  appId: string;
  appSecret: string;
  templateId: string;
  openId: string;
  url?: string;
}

// KV operation types
export interface KVGetResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface KVPutRequest<T> {
  key: string;
  value: T;
  ttl?: number;
}

export interface KVListResponse {
  success: boolean;
  keys: string[];
  complete: boolean;
  cursor?: string;
}

// Error codes
export const ErrorCodes = {
  MISSING_TITLE: 40001,
  INVALID_PARAM: 40002,
  INVALID_CHANNEL_CONFIG: 40003,
  INVALID_SENDKEY: 40101,
  MESSAGE_NOT_FOUND: 40401,
  CHANNEL_NOT_FOUND: 40402,
  RATE_LIMIT_EXCEEDED: 42901,
  INTERNAL_ERROR: 50001,
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
