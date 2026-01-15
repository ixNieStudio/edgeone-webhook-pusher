import { randomBytes } from 'crypto';
import { KeyPrefixes } from './types.js';

/**
 * Generate a cryptographically secure Admin Token
 * Format: AT_ + 32 URL-safe characters (total 35+ chars)
 * @returns {string}
 */
export function generateAdminToken() {
  const random = randomBytes(24).toString('base64url');
  return `${KeyPrefixes.ADMIN_TOKEN}${random}`;
}

/**
 * Generate a unique Channel ID
 * Format: ch_ + 16 hex characters
 * @returns {string}
 */
export function generateChannelId() {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.CHANNEL}${random}`;
}

/**
 * Generate a unique App ID
 * Format: app_ + 16 hex characters
 * @returns {string}
 */
export function generateAppId() {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.APP}${random}`;
}

/**
 * Generate a unique App Key for webhook
 * Format: APK + 29 URL-safe characters (total 32 chars)
 * @returns {string}
 */
export function generateAppKey() {
  const random = randomBytes(22).toString('base64url').slice(0, 29);
  return `${KeyPrefixes.APP_KEY}${random}`;
}

/**
 * Generate a unique OpenID record ID
 * Format: oid_ + 16 hex characters
 * @returns {string}
 */
export function generateOpenIdRecordId() {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.OPENID}${random}`;
}

/**
 * Generate a unique Message ID
 * Format: msg_ + 16 hex characters
 * @returns {string}
 */
export function generateMessageId() {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.MESSAGE}${random}`;
}

/**
 * Generate a unique ID (hex format) - legacy
 * @returns {string}
 */
export function generateId() {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a unique push ID - legacy
 * @returns {string}
 */
export function generatePushId() {
  return `push_${randomBytes(12).toString('hex')}`;
}

/**
 * Get current ISO timestamp
 * @returns {string}
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Mask sensitive credential values
 * @param {string} value
 * @returns {string}
 */
export function maskCredential(value) {
  if (!value) return '';
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
}

/**
 * Mask all sensitive fields in credentials object
 * @param {Object} credentials
 * @param {string[]} sensitiveFields
 * @returns {Object}
 */
export function maskCredentials(credentials, sensitiveFields) {
  const masked = { ...credentials };
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = maskCredential(masked[field]);
    }
  }
  return masked;
}

/**
 * Validate Admin Token format
 * @param {string} token
 * @returns {boolean}
 */
export function isValidAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith(KeyPrefixes.ADMIN_TOKEN)) return false;
  if (token.length < 35) return false;
  // URL-safe base64 characters only after prefix
  const suffix = token.slice(KeyPrefixes.ADMIN_TOKEN.length);
  return /^[A-Za-z0-9_-]+$/.test(suffix);
}

/**
 * Validate App Key format
 * @param {string} appKey
 * @returns {boolean}
 */
export function isValidAppKey(appKey) {
  if (!appKey || typeof appKey !== 'string') return false;
  if (!appKey.startsWith(KeyPrefixes.APP_KEY)) return false;
  if (appKey.length < 32) return false;
  // URL-safe base64 characters only after prefix
  const suffix = appKey.slice(KeyPrefixes.APP_KEY.length);
  return /^[A-Za-z0-9_-]+$/.test(suffix);
}

/**
 * Parse key from webhook URL path
 * Extracts key from formats like "APKxxx.send"
 * @param {string} path
 * @returns {{ key: string } | null}
 */
export function parseWebhookPath(path) {
  if (!path) return null;
  
  // Remove leading slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Match pattern: {key}.send
  const match = cleanPath.match(/^([A-Za-z0-9_-]+)\.send$/);
  if (!match) return null;
  
  return {
    key: match[1],
  };
}


/**
 * Sanitize user input to prevent XSS and injection attacks
 * @param {string} input
 * @returns {string}
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  // Basic HTML entity encoding for common dangerous characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
