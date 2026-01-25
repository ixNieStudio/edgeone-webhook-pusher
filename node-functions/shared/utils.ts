/**
 * 工具函数
 */

import { randomBytes } from 'crypto';
import { KeyPrefixes } from '../types/index.js';

/**
 * Generate a cryptographically secure Admin Token
 * Format: AT_ + 32 URL-safe characters (total 35+ chars)
 */
export function generateAdminToken(): string {
  const random = randomBytes(24).toString('base64url');
  return `${KeyPrefixes.ADMIN_TOKEN}${random}`;
}

/**
 * Generate a unique Channel ID
 * Format: ch_ + 16 hex characters
 */
export function generateChannelId(): string {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.CHANNEL}${random}`;
}

/**
 * Generate a unique App ID
 * Format: app_ + 16 hex characters
 */
export function generateAppId(): string {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.APP}${random}`;
}

/**
 * Generate a unique App Key for webhook
 * Format: APK + 29 URL-safe characters (total 32 chars)
 */
export function generateAppKey(): string {
  const random = randomBytes(22).toString('base64url').slice(0, 29);
  return `${KeyPrefixes.APP_KEY}${random}`;
}

/**
 * Generate a unique OpenID record ID
 * Format: oid_ + 16 hex characters
 */
export function generateOpenIdRecordId(): string {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.OPENID}${random}`;
}

/**
 * Generate a unique Message ID
 * Format: msg_ + 16 hex characters
 */
export function generateMessageId(): string {
  const random = randomBytes(8).toString('hex');
  return `${KeyPrefixes.MESSAGE}${random}`;
}

/**
 * Generate a unique ID (hex format) - legacy
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a unique push ID - legacy
 */
export function generatePushId(): string {
  return `push_${randomBytes(12).toString('hex')}`;
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Mask sensitive credential values
 */
export function maskCredential(value: string): string {
  if (!value) return '';
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
}

/**
 * Mask all sensitive fields in credentials object
 */
export function maskCredentials<T extends Record<string, unknown>>(
  credentials: T,
  sensitiveFields: (keyof T)[]
): T {
  const masked = { ...credentials };
  for (const field of sensitiveFields) {
    if (typeof masked[field] === 'string') {
      (masked as Record<string, unknown>)[field as string] = maskCredential(masked[field] as string);
    }
  }
  return masked;
}

/**
 * Validate Admin Token format
 */
export function isValidAdminToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith(KeyPrefixes.ADMIN_TOKEN)) return false;
  if (token.length < 35) return false;
  const suffix = token.slice(KeyPrefixes.ADMIN_TOKEN.length);
  return /^[A-Za-z0-9_-]+$/.test(suffix);
}

/**
 * Validate App Key format
 */
export function isValidAppKey(appKey: string): boolean {
  if (!appKey || typeof appKey !== 'string') return false;
  if (!appKey.startsWith(KeyPrefixes.APP_KEY)) return false;
  if (appKey.length < 32) return false;
  const suffix = appKey.slice(KeyPrefixes.APP_KEY.length);
  return /^[A-Za-z0-9_-]+$/.test(suffix);
}

/**
 * Parse key from webhook URL path
 * Extracts key from formats like "APKxxx.send"
 */
export function parseWebhookPath(path: string): { key: string } | null {
  if (!path) return null;
  
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const match = cleanPath.match(/^([A-Za-z0-9_-]+)\.send$/);
  if (!match) return null;
  
  return { key: match[1] };
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * 验证密码格式（后端简化版）
 * 使用正则表达式进行基本格式验证
 * @param password - 待验证的密码
 * @returns 验证是否通过
 */
export function validatePasswordFormat(password: string): boolean {
  if (!password || password.length < 12) {
    return false;
  }
  
  // 检查是否包含大写字母
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  
  // 检查是否包含小写字母
  if (!/[a-z]/.test(password)) {
    return false;
  }
  
  // 检查是否包含数字
  if (!/[0-9]/.test(password)) {
    return false;
  }
  
  // 检查是否包含特殊字符
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    return false;
  }
  
  return true;
}
