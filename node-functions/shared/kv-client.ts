/**
 * KV Client - Wrapper for Edge Functions KV API
 * Calls the Edge Functions to perform KV operations
 * 
 * 架构说明：
 * Node Functions 无法直接访问 EdgeOne KV，需要通过 Edge Functions 代理
 * Edge Functions 位于 edge-functions/api/kv/ 目录
 * 
 * 安全说明：
 * 所有请求都需要携带 X-Internal-Key header 进行认证
 * 优先使用环境变量 INTERNAL_DEBUG_KEY（本地调试），否则使用构建时生成的密钥
 * 
 * 优先使用环境变量 KV_BASE_URL，生产环境留空使用同源请求
 */

// 导入构建时生成的密钥配置
import keyConfig from '../../shared/internal-key.json' with { type: 'json' };

// Store for dynamic base URL (set from request context)
let dynamicBaseUrl: string | null = null;

/**
 * Set the base URL dynamically from request context
 * 用于在请求上下文中设置 baseUrl
 */
export function setKVBaseUrl(url: string): void {
  dynamicBaseUrl = url;
}

/**
 * Get the base URL for KV API
 * 优先级：环境变量 KV_BASE_URL > 动态设置的 baseUrl > 空字符串（同源请求）
 */
function getBaseUrl(): string {
  const envUrl = process.env.KV_BASE_URL;
  
  // 如果环境变量存在且不为空，使用环境变量
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  
  // 否则使用动态设置的 baseUrl（从请求上下文中获取）
  return dynamicBaseUrl || '';
}

/**
 * 获取内部 API 密钥
 * 优先使用调试密钥（本地开发），否则使用构建时生成的密钥
 */
export function getInternalKey(): string {
  // 优先使用调试密钥（本地开发时通过 .env.local 配置）
  if (process.env.INTERNAL_DEBUG_KEY) {
    return process.env.INTERNAL_DEBUG_KEY;
  }
  // 否则使用构建时生成的密钥
  return keyConfig.buildKey;
}

/**
 * 获取包含认证信息的请求头
 */
function getAuthHeaders(): Record<string, string> {
  return {
    'X-Internal-Key': getInternalKey(),
  };
}

/**
 * KV 操作接口
 */
export interface KVOperations<T = unknown> {
  get<R = T>(key: string): Promise<R | null>;
  put<R = T>(key: string, value: R, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string, limit?: number, cursor?: string): Promise<KVListResult>;
  listAll(prefix?: string): Promise<string[]>;
}

export interface KVListResult {
  keys: string[];
  complete: boolean;
  cursor?: string;
}

interface KVResponse<T = unknown> {
  success: boolean;
  data?: T;
  keys?: string[];
  complete?: boolean;
  cursor?: string;
  error?: string;
}

/**
 * Create a typed KV client for a specific namespace
 */
function createKVClient<T = unknown>(namespace: string): KVOperations<T> {
  return {
    async get<R = T>(key: string): Promise<R | null> {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const res = await fetch(`${baseUrl}?action=get&key=${encodeURIComponent(key)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json() as KVResponse<R>;
      if (!data.success) {
        throw new Error(data.error || 'KV get failed');
      }
      return data.data ?? null;
    },

    async put<R = T>(key: string, value: R, ttl?: number): Promise<void> {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const res = await fetch(`${baseUrl}?action=put`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ key, value, ttl }),
      });
      const data = await res.json() as KVResponse;
      if (!data.success) {
        throw new Error(data.error || 'KV put failed');
      }
    },

    async delete(key: string): Promise<void> {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const res = await fetch(`${baseUrl}?action=delete&key=${encodeURIComponent(key)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json() as KVResponse;
      if (!data.success) {
        throw new Error(data.error || 'KV delete failed');
      }
    },

    async list(prefix = '', limit = 256, cursor?: string): Promise<KVListResult> {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const params = new URLSearchParams({
        action: 'list',
        prefix,
        limit: String(limit),
      });
      if (cursor) {
        params.set('cursor', cursor);
      }
      const res = await fetch(`${baseUrl}?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json() as KVResponse;
      if (!data.success) {
        throw new Error(data.error || 'KV list failed');
      }
      return {
        keys: data.keys || [],
        complete: data.complete ?? true,
        cursor: data.cursor,
      };
    },

    async listAll(prefix = ''): Promise<string[]> {
      const allKeys: string[] = [];
      let cursor: string | undefined;
      let complete = false;

      while (!complete) {
        const result = await this.list(prefix, 256, cursor);
        allKeys.push(...result.keys);
        complete = result.complete;
        // Only set cursor if it's a non-empty string
        cursor = result.cursor && result.cursor.length > 0 ? result.cursor : undefined;
      }

      return allKeys;
    },
  };
}

// Import types for typed KV clients
import type { SystemConfig, Channel, App, OpenID, Message } from '../types/index.js';

// Export typed KV clients for each namespace
export const configKV = createKVClient<SystemConfig>('config');
export const channelsKV = createKVClient<Channel>('channels');
export const appsKV = createKVClient<App>('apps');
export const openidsKV = createKVClient<OpenID>('openids');
export const messagesKV = createKVClient<Message>('messages');

// Legacy export for compatibility
export const kvClient = {
  config: configKV,
  channels: channelsKV,
  apps: appsKV,
  openids: openidsKV,
  messages: messagesKV,
};
