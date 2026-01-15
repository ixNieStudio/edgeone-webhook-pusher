/**
 * KV Client - Wrapper for Edge Functions KV API
 * Calls the Edge Functions to perform KV operations
 * 
 * 架构说明：
 * Node Functions 无法直接访问 EdgeOne KV，需要通过 Edge Functions 代理
 * Edge Functions 位于 edge-functions/api/kv/ 目录
 */

// Store for dynamic base URL (set from request context)
let dynamicBaseUrl: string | null = null;

// Environment variable for KV base URL (used in development)
const envKVBaseUrl = typeof process !== 'undefined' && process.env ? process.env.KV_BASE_URL : undefined;

/**
 * Set the base URL dynamically from request context
 */
export function setKVBaseUrl(url: string): void {
  dynamicBaseUrl = url;
}

/**
 * Get the current base URL
 * Priority: environment variable > dynamic URL
 */
function getBaseUrl(): string {
  // In development, prefer environment variable for remote KV access
  if (envKVBaseUrl) {
    return envKVBaseUrl;
  }
  return dynamicBaseUrl || '';
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
      const res = await fetch(`${baseUrl}?action=get&key=${encodeURIComponent(key)}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ttl }),
      });
      const data = await res.json() as KVResponse;
      if (!data.success) {
        throw new Error(data.error || 'KV put failed');
      }
    },

    async delete(key: string): Promise<void> {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const res = await fetch(`${baseUrl}?action=delete&key=${encodeURIComponent(key)}`);
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
      const res = await fetch(`${baseUrl}?${params}`);
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
        cursor = result.cursor;
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
