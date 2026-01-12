/**
 * Re-export error codes from unified error-codes.js
 */
export { ErrorCodes, ErrorMessages } from './error-codes.js';

/**
 * Message types
 */
export const MessageTypes = {
  SINGLE: 'single',
  TOPIC: 'topic',
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
  SEND_KEY: 'SCT',
  TOPIC_KEY: 'TPK',
};

/**
 * KV key formats
 */
export const KVKeys = {
  CONFIG: 'config',
  SENDKEY_PREFIX: 'sk:',
  SENDKEY: (id) => `sk:${id}`,
  SENDKEY_INDEX: (key) => `sk_idx:${key}`,
  TOPIC_PREFIX: 'tp:',
  TOPIC: (id) => `tp:${id}`,
  TOPIC_INDEX: (key) => `tp_idx:${key}`,
  OPENID_PREFIX: 'oid:',
  OPENID: (id) => `oid:${id}`,
  OPENID_INDEX: (openId) => `oid_idx:${openId}`,
  MESSAGE_PREFIX: 'msg:',
  MESSAGE: (id) => `msg:${id}`,
  MESSAGE_LIST: 'msg_list',
};

/**
 * @typedef {Object} AppConfig
 * @property {string} adminToken - Admin token (read-only after creation)
 * @property {Object} wechat - WeChat configuration
 * @property {string} wechat.appId - WeChat public account AppID
 * @property {string} wechat.appSecret - WeChat public account AppSecret
 * @property {string} wechat.templateId - Template message ID
 * @property {Object} rateLimit - Rate limit settings
 * @property {number} rateLimit.perMinute - Messages per minute per key
 * @property {Object} retention - Message retention settings
 * @property {number} retention.days - Days to retain messages
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} SendKeyData
 * @property {string} id - Internal ID
 * @property {string} key - SendKey value (SCT prefix)
 * @property {string} name - Display name
 * @property {string} openIdRef - Reference to OpenID record ID
 * @property {Object} rateLimit - Rate limit state
 * @property {number} rateLimit.count - Current count
 * @property {string} rateLimit.resetAt - ISO timestamp for reset
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} TopicData
 * @property {string} id - Internal ID
 * @property {string} key - TopicKey value (TPK prefix)
 * @property {string} name - Display name
 * @property {string[]} subscriberRefs - Array of OpenID record IDs
 * @property {Object} rateLimit - Rate limit state
 * @property {number} rateLimit.count - Current count
 * @property {string} rateLimit.resetAt - ISO timestamp for reset
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} OpenIdData
 * @property {string} id - Internal ID
 * @property {string} openId - WeChat OpenID
 * @property {string} [name] - Display name
 * @property {string} source - Source (e.g., 'wechat')
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} MessageData
 * @property {string} id - Push ID
 * @property {'single'|'topic'} type - Message type
 * @property {string} keyId - SendKey ID or TopicKey ID
 * @property {string} title - Message title
 * @property {string} [content] - Message content
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
 * @property {boolean} success - Whether push succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [msgId] - WeChat message ID if succeeded
 */

/**
 * @typedef {Object} TopicPushResult
 * @property {string} pushId - Push ID
 * @property {number} total - Total subscribers
 * @property {number} success - Successful deliveries
 * @property {number} failed - Failed deliveries
 * @property {DeliveryResult[]} results - Individual results
 */
