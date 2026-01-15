/**
 * Re-export error codes from unified error-codes.js
 */
export { ErrorCodes, ErrorMessages } from './error-codes.js';

/**
 * Channel types
 */
export const ChannelTypes = {
  WECHAT: 'wechat',
};

/**
 * Push modes
 */
export const PushModes = {
  SINGLE: 'single',      // 单发模式：发送给第一个绑定的 OpenID
  SUBSCRIBE: 'subscribe', // 订阅模式：发送给所有绑定的 OpenID
};

/**
 * Message types
 */
export const MessageTypes = {
  NORMAL: 'normal',      // 普通客服消息
  TEMPLATE: 'template',  // 模板消息
};

/**
 * Default configuration values
 */
export const DefaultConfig = {
  rateLimit: {
    perMinute: 5,
  },
  retention: {
    days: 30,
  },
};

/**
 * Key prefixes for different data types
 */
export const KeyPrefixes = {
  ADMIN_TOKEN: 'AT_',
  CHANNEL: 'ch_',
  APP: 'app_',
  APP_KEY: 'APK',
  OPENID: 'oid_',
  MESSAGE: 'msg_',
};

/**
 * KV key formats
 */
export const KVKeys = {
  // System config
  CONFIG: 'config',
  
  // Channels
  CHANNEL_PREFIX: 'ch:',
  CHANNEL: (id) => `ch:${id}`,
  CHANNEL_LIST: 'ch_list',
  
  // Apps
  APP_PREFIX: 'app:',
  APP: (id) => `app:${id}`,
  APP_INDEX: (key) => `app_idx:${key}`,
  APP_LIST: 'app_list',
  
  // OpenIDs (scoped to app)
  OPENID_PREFIX: 'oid:',
  OPENID: (id) => `oid:${id}`,
  OPENID_APP: (appId) => `oid_app:${appId}`,
  OPENID_INDEX: (appId, openId) => `oid_idx:${appId}:${openId}`,
  
  // Messages
  MESSAGE_PREFIX: 'msg:',
  MESSAGE: (id) => `msg:${id}`,
  MESSAGE_LIST: 'msg_list',
  MESSAGE_APP: (appId) => `msg_app:${appId}`,
  
  // WeChat token cache
  WECHAT_TOKEN: (appId) => `wechat_token:${appId}`,
};

/**
 * @typedef {Object} SystemConfig
 * @property {string} adminToken - Admin token (read-only after creation)
 * @property {Object} rateLimit - Rate limit settings
 * @property {number} rateLimit.perMinute - Messages per minute per app
 * @property {Object} retention - Message retention settings
 * @property {number} retention.days - Days to retain messages
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} Channel
 * @property {string} id - Unique identifier (ch_xxx)
 * @property {string} name - Channel name
 * @property {'wechat'} type - Channel type
 * @property {Object} config - Channel configuration
 * @property {string} config.appId - WeChat AppID
 * @property {string} config.appSecret - WeChat AppSecret
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} App
 * @property {string} id - Unique identifier (app_xxx)
 * @property {string} key - Webhook key (APK_xxx)
 * @property {string} name - App name
 * @property {string} channelId - Associated channel ID
 * @property {'single'|'subscribe'} pushMode - Push mode
 * @property {'normal'|'template'} messageType - Message type
 * @property {string} [templateId] - Template ID (required when messageType=template)
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} OpenID
 * @property {string} id - Unique identifier (oid_xxx)
 * @property {string} appId - Parent app ID
 * @property {string} openId - WeChat OpenID
 * @property {string} [nickname] - User nickname
 * @property {string} [remark] - Remark
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID (msg_xxx)
 * @property {string} appId - App ID
 * @property {string} title - Message title
 * @property {string} [desp] - Message description/content
 * @property {DeliveryResult[]} results - Delivery results
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} DeliveryResult
 * @property {string} openId - Target OpenID
 * @property {boolean} success - Whether delivery succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [msgId] - WeChat message ID if succeeded
 */

/**
 * @typedef {Object} PushResult
 * @property {string} pushId - Push ID
 * @property {number} total - Total recipients
 * @property {number} success - Successful deliveries
 * @property {number} failed - Failed deliveries
 * @property {DeliveryResult[]} results - Individual results
 */
