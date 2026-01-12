/**
 * Unified Error Codes
 * Feature: frontend-admin-ui
 * 
 * All error codes for API responses.
 */

export const ErrorCodes = {
  // Success
  SUCCESS: 0,

  // Validation errors (400xx)
  MISSING_TITLE: 40001,
  INVALID_PARAM: 40002,
  INVALID_CONFIG: 40003,
  INVALID_STATE: 40004,
  STATE_EXPIRED: 40005,
  OAUTH_FAILED: 40006,
  NOT_FOLLOWED: 40007,
  ALREADY_BOUND: 40008,
  ALREADY_SUBSCRIBED: 40009,

  // Authentication errors (401xx)
  INVALID_TOKEN: 40101,
  TOKEN_REQUIRED: 40102,
  UNAUTHORIZED: 40100,

  // Not found errors (404xx)
  KEY_NOT_FOUND: 40401,
  SENDKEY_NOT_FOUND: 40401,  // Alias
  TOPIC_NOT_FOUND: 40402,
  MESSAGE_NOT_FOUND: 40403,
  OPENID_NOT_FOUND: 40404,
  NO_SUBSCRIBERS: 40405,

  // Rate limit errors (429xx)
  RATE_LIMIT_EXCEEDED: 42901,

  // Internal errors (500xx)
  SERVER_ERROR: 50000,
  INTERNAL_ERROR: 50001,
  CONFIG_ERROR: 50002,
  WECHAT_API_ERROR: 50003,
};

export const ErrorMessages = {
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
  [ErrorCodes.NO_SUBSCRIBERS]: 'Topic has no subscribers',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ErrorCodes.SERVER_ERROR]: '服务器错误',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error',
  [ErrorCodes.CONFIG_ERROR]: '配置错误',
  [ErrorCodes.WECHAT_API_ERROR]: 'WeChat API error',
};

/**
 * Create error response object
 * @param {number} code - Error code
 * @param {string} [message] - Custom message (optional)
 * @param {any} [detail] - Additional detail (optional)
 */
export function errorResponse(code, message, detail) {
  return {
    code,
    message: message || ErrorMessages[code] || '未知错误',
    ...(detail !== undefined && { detail }),
  };
}

/**
 * Create success response object
 * @param {any} data - Response data
 * @param {string} [message] - Success message
 */
export function successResponse(data, message = '成功') {
  return {
    code: 0,
    message,
    data,
  };
}

/**
 * Map error code to HTTP status
 * @param {number} code - Error code
 * @returns {number} HTTP status code
 */
export function getHttpStatus(code) {
  if (code === 0) return 200;
  if (code >= 40000 && code < 40100) return 400;
  if (code >= 40100 && code < 40200) return 401;
  if (code >= 40400 && code < 40500) return 404;
  if (code >= 42900 && code < 43000) return 429;
  if (code >= 50000) return 500;
  return 500;
}
