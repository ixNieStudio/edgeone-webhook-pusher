/**
 * 常量定义
 */

export const ChannelTypes = {
  WECHAT: 'wechat',
  WORK_WECHAT: 'work_wechat',
  DINGTALK: 'dingtalk',
  FEISHU: 'feishu',
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
  CONFIG: 'cfg',
  CHANNEL_PREFIX: 'c:',
  CHANNEL: (id: string) => `c:${id}`,
  CHANNEL_LIST: 'cl',
  APP_PREFIX: 'a:',
  APP: (id: string) => `a:${id}`,
  APP_INDEX: (key: string) => `ak:${key}`,
  APP_LIST: 'al',
  APP_CONFIG_PREFIX: 'ac:',
  APP_CONFIG: (appId: string) => `ac:${appId}`,
  OPENID_PREFIX: 'o:',
  OPENID: (id: string) => `o:${id}`,
  OPENID_APP: (appId: string) => `oa:${appId}`,
  OPENID_INDEX: (appId: string, openId: string) => `ox:${appId}:${openId}`,
  MESSAGE_PREFIX: 'm:',
  MESSAGE: (id: string) => `m:${id}`,
  MESSAGE_LIST: 'ml',
  MESSAGE_APP: (appId: string) => `ma:${appId}`,
  MESSAGE_DETAIL_PREFIX: 'md:',
  MESSAGE_DETAIL: (token: string) => `md:${token}`,
  WECHAT_TOKEN: (appId: string) => `wt:${appId}`,
} as const;

export const DefaultConfig = {
  rateLimit: {
    perMinute: 5,
  },
  retention: {
    days: 30,
  },
} as const;
