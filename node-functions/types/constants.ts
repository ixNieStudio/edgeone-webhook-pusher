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
  AUTH_PROFILE_LIST: 'pl',
  AUTH_PROFILE_SUMMARY_PREFIX: 'ps:',
  AUTH_PROFILE_SUMMARY: (id: string) => `ps:${id}`,
  AUTH_PROFILE_META: 'pm',
  AUTH_PROFILE_USAGE_PREFIX: 'pu:',
  AUTH_PROFILE_USAGE: (id: string) => `pu:${id}`,
  AUTH_PROFILE_REPAIR_FAILURE: 'prf',
  APP_PREFIX: 'a:',
  APP: (id: string) => `a:${id}`,
  APP_SEND_PROFILE_PREFIX: 'ap:',
  APP_SEND_PROFILE: (key: string) => `ap:${key}`,
  APP_INDEX: (key: string) => `ak:${key}`,
  APP_LIST: 'al',
  APP_SUMMARY_PREFIX: 'as:',
  APP_SUMMARY: (id: string) => `as:${id}`,
  APP_META: 'am',
  APP_REPAIR_FAILURE: 'arf',
  APP_CONFIG_PREFIX: 'ac:',
  APP_CONFIG: (appId: string) => `ac:${appId}`,
  OPENID_PREFIX: 'o:',
  OPENID: (id: string) => `o:${id}`,
  OPENID_APP: (appId: string) => `oa:${appId}`,
  OPENID_VALUES_PREFIX: 'ov:',
  OPENID_VALUES: (appId: string) => `ov:${appId}`,
  OPENID_INDEX: (appId: string, openId: string) => `ox:${appId}:${openId}`,
  BINDCODE_PREFIX: 'bc:',
  BINDCODE: (code: string) => `bc:${code}`,
  MESSAGE_PREFIX: 'm:',
  MESSAGE: (id: string) => `m:${id}`,
  MESSAGE_SUMMARY_PREFIX: 'ms:',
  MESSAGE_SUMMARY: (id: string) => `ms:${id}`,
  MESSAGE_LIST: 'ml',
  MESSAGE_LIST_HEAD: 'mh',
  MESSAGE_COUNT: 'mc',
  MESSAGE_APP_PREFIX: 'ma:',
  MESSAGE_APP: (appId: string) => `ma:${appId}`,
  MESSAGE_APP_HEAD_PREFIX: 'mah:',
  MESSAGE_APP_HEAD: (appId: string) => `mah:${appId}`,
  MESSAGE_APP_COUNT_PREFIX: 'mac:',
  MESSAGE_APP_COUNT: (appId: string) => `mac:${appId}`,
  MESSAGE_INDEX_META: 'mi',
  MESSAGE_DETAIL_PREFIX: 'md:',
  MESSAGE_DETAIL: (token: string) => `md:${token}`,
  WECHAT_TOKEN: (appId: string) => `wt:${appId}`,
  WECHAT_TOKEN_STATUS: (channelId: string) => `ws:${channelId}`,
  WORK_WECHAT_TOKEN: (corpId: string, agentId: string) => `xt:${corpId}:${agentId}`,
  WORK_WECHAT_TOKEN_STATUS: (channelId: string) => `xs:${channelId}`,
} as const;

export const LegacyKVKeys = {
  CONFIG: 'config',
  CHANNEL_PREFIX: 'ch:',
  CHANNEL: (id: string) => `ch:${id}`,
  CHANNEL_LIST: 'ch_list',
  AUTH_PROFILE_LIST: 'auth_profile_list',
  AUTH_PROFILE_SUMMARY_PREFIX: 'auth_profile_summary:',
  AUTH_PROFILE_SUMMARY: (id: string) => `auth_profile_summary:${id}`,
  AUTH_PROFILE_META: 'auth_profile_meta',
  AUTH_PROFILE_USAGE_PREFIX: 'auth_profile_usage:',
  AUTH_PROFILE_USAGE: (id: string) => `auth_profile_usage:${id}`,
  AUTH_PROFILE_REPAIR_FAILURE: 'auth_profile_repair_failure',
  APP_PREFIX: 'app:',
  APP: (id: string) => `app:${id}`,
  APP_BY_KEY_PREFIX: 'app_key:',
  APP_BY_KEY: (key: string) => `app_key:${key}`,
  APP_SEND_PROFILE_PREFIX: 'app_send:',
  APP_SEND_PROFILE: (key: string) => `app_send:${key}`,
  APP_INDEX: (key: string) => `app_idx:${key}`,
  APP_LIST: 'app_list',
  APP_SUMMARY_PREFIX: 'app_summary:',
  APP_SUMMARY: (id: string) => `app_summary:${id}`,
  APP_META: 'app_meta',
  APP_REPAIR_FAILURE: 'app_repair_failure',
  APP_CONFIG_PREFIX: 'app_cfg:',
  APP_CONFIG: (appId: string) => `app_cfg:${appId}`,
  APP_CONFIG_V2_PREFIX: 'app_cfg_v2:',
  APP_CONFIG_V2: (appId: string) => `app_cfg_v2:${appId}`,
  OPENID_PREFIX: 'oid:',
  OPENID: (id: string) => `oid:${id}`,
  OPENID_APP: (appId: string) => `oid_app:${appId}`,
  OPENID_VALUES_PREFIX: 'oid_values:',
  OPENID_VALUES: (appId: string) => `oid_values:${appId}`,
  OPENID_INDEX: (appId: string, openId: string) => `oid_idx:${appId}:${openId}`,
  BINDCODE_PREFIX: 'bc:',
  BINDCODE: (code: string) => `bc:${code}`,
  MESSAGE_PREFIX: 'msg:',
  MESSAGE: (id: string) => `msg:${id}`,
  MESSAGE_SUMMARY_PREFIX: 'msg_summary:',
  MESSAGE_SUMMARY: (id: string) => `msg_summary:${id}`,
  MESSAGE_LIST: 'msg_list',
  MESSAGE_LIST_HEAD: 'msg_head',
  MESSAGE_COUNT: 'msg_count',
  MESSAGE_CHANNEL_PREFIX: 'msg_channel:',
  MESSAGE_CHANNEL: (channelId: string) => `msg_channel:${channelId}`,
  MESSAGE_CHANNEL_HEAD_PREFIX: 'msg_channel_head:',
  MESSAGE_CHANNEL_HEAD: (channelId: string) => `msg_channel_head:${channelId}`,
  MESSAGE_CHANNEL_COUNT_PREFIX: 'msg_channel_count:',
  MESSAGE_CHANNEL_COUNT: (channelId: string) => `msg_channel_count:${channelId}`,
  MESSAGE_APP_PREFIX: 'msg_app:',
  MESSAGE_APP: (appId: string) => `msg_app:${appId}`,
  MESSAGE_APP_HEAD_PREFIX: 'msg_app_head:',
  MESSAGE_APP_HEAD: (appId: string) => `msg_app_head:${appId}`,
  MESSAGE_APP_COUNT_PREFIX: 'msg_app_count:',
  MESSAGE_APP_COUNT: (appId: string) => `msg_app_count:${appId}`,
  MESSAGE_OPENID_PREFIX: 'msg_openid:',
  MESSAGE_OPENID: (openId: string) => `msg_openid:${openId}`,
  MESSAGE_OPENID_HEAD_PREFIX: 'msg_openid_head:',
  MESSAGE_OPENID_HEAD: (openId: string) => `msg_openid_head:${openId}`,
  MESSAGE_OPENID_COUNT_PREFIX: 'msg_openid_count:',
  MESSAGE_OPENID_COUNT: (openId: string) => `msg_openid_count:${openId}`,
  MESSAGE_INDEX_META: 'msg_index_meta',
  MESSAGE_DETAIL_PREFIX: 'msg_detail:',
  MESSAGE_DETAIL: (token: string) => `msg_detail:${token}`,
  WECHAT_TOKEN: (appId: string) => `wechat_token:${appId}`,
  WECHAT_TOKEN_STATUS: (channelId: string) => `wechat_token_status:${channelId}`,
  WORK_WECHAT_TOKEN: (corpId: string, agentId: string) => `work_wechat_token:${corpId}:${agentId}`,
  WORK_WECHAT_TOKEN_STATUS: (channelId: string) => `work_wechat_token_status:${channelId}`,
} as const;

const exactLegacyKeyMap = new Map<string, string>([
  [KVKeys.CONFIG, LegacyKVKeys.CONFIG],
  [KVKeys.CHANNEL_LIST, LegacyKVKeys.CHANNEL_LIST],
  [KVKeys.AUTH_PROFILE_LIST, LegacyKVKeys.AUTH_PROFILE_LIST],
  [KVKeys.AUTH_PROFILE_META, LegacyKVKeys.AUTH_PROFILE_META],
  [KVKeys.AUTH_PROFILE_REPAIR_FAILURE, LegacyKVKeys.AUTH_PROFILE_REPAIR_FAILURE],
  [KVKeys.APP_LIST, LegacyKVKeys.APP_LIST],
  [KVKeys.APP_META, LegacyKVKeys.APP_META],
  [KVKeys.APP_REPAIR_FAILURE, LegacyKVKeys.APP_REPAIR_FAILURE],
  [KVKeys.MESSAGE_LIST, LegacyKVKeys.MESSAGE_LIST],
  [KVKeys.MESSAGE_LIST_HEAD, LegacyKVKeys.MESSAGE_LIST_HEAD],
  [KVKeys.MESSAGE_COUNT, LegacyKVKeys.MESSAGE_COUNT],
  [KVKeys.MESSAGE_INDEX_META, LegacyKVKeys.MESSAGE_INDEX_META],
]);

const prefixLegacyKeyMap: Array<[string, string]> = [
  [KVKeys.CHANNEL_PREFIX, LegacyKVKeys.CHANNEL_PREFIX],
  [KVKeys.AUTH_PROFILE_SUMMARY_PREFIX, LegacyKVKeys.AUTH_PROFILE_SUMMARY_PREFIX],
  [KVKeys.AUTH_PROFILE_USAGE_PREFIX, LegacyKVKeys.AUTH_PROFILE_USAGE_PREFIX],
  [KVKeys.APP_SEND_PROFILE_PREFIX, LegacyKVKeys.APP_SEND_PROFILE_PREFIX],
  ['ak:', 'app_idx:'],
  [KVKeys.APP_SUMMARY_PREFIX, LegacyKVKeys.APP_SUMMARY_PREFIX],
  [KVKeys.APP_CONFIG_PREFIX, LegacyKVKeys.APP_CONFIG_PREFIX],
  [KVKeys.APP_PREFIX, LegacyKVKeys.APP_PREFIX],
  [KVKeys.OPENID_VALUES_PREFIX, LegacyKVKeys.OPENID_VALUES_PREFIX],
  [KVKeys.OPENID_PREFIX, LegacyKVKeys.OPENID_PREFIX],
  ['oa:', 'oid_app:'],
  ['ox:', 'oid_idx:'],
  [KVKeys.MESSAGE_SUMMARY_PREFIX, LegacyKVKeys.MESSAGE_SUMMARY_PREFIX],
  [KVKeys.MESSAGE_APP_HEAD_PREFIX, LegacyKVKeys.MESSAGE_APP_HEAD_PREFIX],
  [KVKeys.MESSAGE_APP_COUNT_PREFIX, LegacyKVKeys.MESSAGE_APP_COUNT_PREFIX],
  [KVKeys.MESSAGE_APP_PREFIX, LegacyKVKeys.MESSAGE_APP_PREFIX],
  [KVKeys.MESSAGE_DETAIL_PREFIX, LegacyKVKeys.MESSAGE_DETAIL_PREFIX],
  [KVKeys.MESSAGE_PREFIX, LegacyKVKeys.MESSAGE_PREFIX],
  ['wt:', 'wechat_token:'],
  ['ws:', 'wechat_token_status:'],
  ['xt:', 'work_wechat_token:'],
  ['xs:', 'work_wechat_token_status:'],
];

const inverseExactLegacyKeyMap = new Map(
  Array.from(exactLegacyKeyMap.entries()).map(([currentKey, legacyKey]) => [legacyKey, currentKey])
);

export function getLegacyKVKey(currentKey: string): string | null {
  const exact = exactLegacyKeyMap.get(currentKey);
  if (exact) {
    return exact;
  }

  for (const [currentPrefix, legacyPrefix] of prefixLegacyKeyMap) {
    if (currentKey.startsWith(currentPrefix)) {
      return `${legacyPrefix}${currentKey.slice(currentPrefix.length)}`;
    }
  }

  return null;
}

export function normalizeLegacyKVKey(key: string): string {
  const exact = inverseExactLegacyKeyMap.get(key);
  if (exact) {
    return exact;
  }

  for (const [currentPrefix, legacyPrefix] of prefixLegacyKeyMap) {
    if (key.startsWith(legacyPrefix)) {
      return `${currentPrefix}${key.slice(legacyPrefix.length)}`;
    }
  }

  return key;
}

export function getLegacyKVPrefix(currentPrefix: string): string | null {
  return getLegacyKVKey(currentPrefix);
}

export const DefaultConfig = {
  rateLimit: {
    perMinute: 5,
  },
  retention: {
    days: 30,
  },
} as const;
