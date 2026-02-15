/**
 * 常量定义
 */

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
