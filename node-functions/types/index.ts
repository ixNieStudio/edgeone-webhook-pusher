/**
 * TypeScript 类型定义
 */

// ============ Channel 渠道 ============

export type ChannelType = 'wechat';

export interface WeChatConfig {
  appId: string;
  appSecret: string;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  config: WeChatConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelInput {
  name: string;
  type?: ChannelType;
  config: WeChatConfig;
}

export interface UpdateChannelInput {
  name?: string;
  config?: Partial<WeChatConfig>;
}

// ============ App 应用 ============

export type PushMode = 'single' | 'subscribe';
export type MessageType = 'normal' | 'template';

export interface App {
  id: string;
  key: string;
  name: string;
  channelId: string;
  pushMode: PushMode;
  messageType: MessageType;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppInput {
  name: string;
  channelId: string;
  pushMode: PushMode;
  messageType?: MessageType;
  templateId?: string;
}

export interface UpdateAppInput {
  name?: string;
  templateId?: string;
}

// ============ OpenID 订阅者 ============

export interface OpenID {
  id: string;
  appId: string;
  openId: string;
  nickname?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpenIDInput {
  openId: string;
  nickname?: string;
  remark?: string;
}

export interface UpdateOpenIDInput {
  nickname?: string;
  remark?: string;
}

// ============ Message 消息 ============

export interface DeliveryResult {
  openId: string;
  success: boolean;
  error?: string;
  msgId?: string;
}

export interface Message {
  id: string;
  appId: string;
  title: string;
  desp?: string;
  results: DeliveryResult[];
  createdAt: string;
}

export interface PushMessageInput {
  title: string;
  desp?: string;
}

export interface PushResult {
  pushId: string;
  total: number;
  success: number;
  failed: number;
  results?: DeliveryResult[];
}

// ============ System 系统配置 ============

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

// ============ API 响应 ============

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

// ============ 错误码枚举 ============

export const ErrorCodes = {
  SUCCESS: 0,
  MISSING_TITLE: 40001,
  INVALID_PARAM: 40002,
  INVALID_CONFIG: 40003,
  INVALID_STATE: 40004,
  STATE_EXPIRED: 40005,
  OAUTH_FAILED: 40006,
  NOT_FOLLOWED: 40007,
  ALREADY_BOUND: 40008,
  ALREADY_SUBSCRIBED: 40009,
  INVALID_TOKEN: 40101,
  TOKEN_REQUIRED: 40102,
  UNAUTHORIZED: 40100,
  KEY_NOT_FOUND: 40401,
  SENDKEY_NOT_FOUND: 40401,
  TOPIC_NOT_FOUND: 40402,
  MESSAGE_NOT_FOUND: 40403,
  OPENID_NOT_FOUND: 40404,
  NO_SUBSCRIBERS: 40405,
  CHANNEL_NOT_FOUND: 40406,
  APP_NOT_FOUND: 40407,
  REFERENCE_EXISTS: 40901,
  RATE_LIMIT_EXCEEDED: 42901,
  SERVER_ERROR: 50000,
  INTERNAL_ERROR: 50001,
  CONFIG_ERROR: 50002,
  WECHAT_API_ERROR: 50003,
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export const ErrorMessages: Record<number, string> = {
  [ErrorCodes.SUCCESS]: '成功',
  [ErrorCodes.MISSING_TITLE]: 'Message title is required',
  [ErrorCodes.INVALID_PARAM]: 'Invalid parameter',
  [ErrorCodes.INVALID_CONFIG]: 'Invalid configuration',
  [ErrorCodes.INVALID_STATE]: '无效的请求参数',
  [ErrorCodes.STATE_EXPIRED]: '链接已过期或无效',
  [ErrorCodes.OAUTH_FAILED]: '微信授权失败',
  [ErrorCodes.NOT_FOLLOWED]: '请先关注公众号',
  [ErrorCodes.ALREADY_BOUND]: '已绑定',
  [ErrorCodes.ALREADY_SUBSCRIBED]: '已订阅',
  [ErrorCodes.INVALID_TOKEN]: 'Invalid admin token',
  [ErrorCodes.TOKEN_REQUIRED]: 'Admin token is required',
  [ErrorCodes.UNAUTHORIZED]: '未授权',
  [ErrorCodes.KEY_NOT_FOUND]: 'SendKey or TopicKey not found',
  [ErrorCodes.TOPIC_NOT_FOUND]: 'Topic not found',
  [ErrorCodes.MESSAGE_NOT_FOUND]: 'Message not found',
  [ErrorCodes.OPENID_NOT_FOUND]: 'OpenID not found',
  [ErrorCodes.NO_SUBSCRIBERS]: 'No subscribers',
  [ErrorCodes.CHANNEL_NOT_FOUND]: 'Channel not found',
  [ErrorCodes.APP_NOT_FOUND]: 'App not found',
  [ErrorCodes.REFERENCE_EXISTS]: 'Reference exists',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ErrorCodes.SERVER_ERROR]: '服务器错误',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error',
  [ErrorCodes.CONFIG_ERROR]: '配置错误',
  [ErrorCodes.WECHAT_API_ERROR]: 'WeChat API error',
};

// ============ API 错误类 ============

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code: number = ErrorCodes.INVALID_PARAM): ApiError {
    return new ApiError(code, message, 400);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(ErrorCodes.UNAUTHORIZED, message, 401);
  }

  static notFound(message = 'Not found', code: number = ErrorCodes.KEY_NOT_FOUND): ApiError {
    return new ApiError(code, message, 404);
  }

  static conflict(message: string, code: number = ErrorCodes.REFERENCE_EXISTS): ApiError {
    return new ApiError(code, message, 409);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(ErrorCodes.INTERNAL_ERROR, message, 500);
  }
}

// ============ 辅助函数 ============

export function getHttpStatus(code: number): number {
  if (code === 0) return 200;
  if (code >= 40000 && code < 40100) return 400;
  if (code >= 40100 && code < 40200) return 401;
  if (code >= 40400 && code < 40500) return 404;
  if (code >= 40900 && code < 41000) return 409;
  if (code >= 42900 && code < 43000) return 429;
  if (code >= 50000) return 500;
  return 500;
}

// ============ 常量定义 ============

export const ChannelTypes = {
  WECHAT: 'wechat',
} as const;

export const PushModes = {
  SINGLE: 'single',
  SUBSCRIBE: 'subscribe',
} as const;

export const MessageTypes = {
  NORMAL: 'normal',
  TEMPLATE: 'template',
} as const;

export const KeyPrefixes = {
  ADMIN_TOKEN: 'AT_',
  CHANNEL: 'ch_',
  APP: 'app_',
  APP_KEY: 'APK',
  OPENID: 'oid_',
  MESSAGE: 'msg_',
} as const;

export const KVKeys = {
  CONFIG: 'config',
  CHANNEL_PREFIX: 'ch:',
  CHANNEL: (id: string) => `ch:${id}`,
  CHANNEL_LIST: 'ch_list',
  APP_PREFIX: 'app:',
  APP: (id: string) => `app:${id}`,
  APP_INDEX: (key: string) => `app_idx:${key}`,
  APP_LIST: 'app_list',
  OPENID_PREFIX: 'oid:',
  OPENID: (id: string) => `oid:${id}`,
  OPENID_APP: (appId: string) => `oid_app:${appId}`,
  OPENID_INDEX: (appId: string, openId: string) => `oid_idx:${appId}:${openId}`,
  MESSAGE_PREFIX: 'msg:',
  MESSAGE: (id: string) => `msg:${id}`,
  MESSAGE_LIST: 'msg_list',
  MESSAGE_APP: (appId: string) => `msg_app:${appId}`,
  WECHAT_TOKEN: (appId: string) => `wechat_token:${appId}`,
} as const;

export const DefaultConfig = {
  rateLimit: {
    perMinute: 5,
  },
  retention: {
    days: 30,
  },
} as const;
