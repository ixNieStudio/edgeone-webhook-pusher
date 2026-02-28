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

import { AsyncLocalStorage } from 'async_hooks';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

interface KVRequestContext {
  baseUrl: string;
  // 同一次请求内的 GET 结果复用，减少重复 KV HTTP 请求
  getCache: Map<string, unknown>;
  // 同一 key 并发读取时做请求合并
  inflightGets: Map<string, Promise<unknown>>;
}

// AsyncLocalStorage for storing per-request KV context
const asyncLocalStorage = new AsyncLocalStorage<KVRequestContext>();
const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedBuildKey: string | null | undefined;

/**
 * 尝试从 shared/internal-key.json 读取构建时密钥（可选）
 */
function getBuildKeyFromFile(): string | null {
  if (cachedBuildKey !== undefined) {
    return cachedBuildKey;
  }

  const keyPath = resolve(__dirname, '../../shared/internal-key.json');
  if (!existsSync(keyPath)) {
    cachedBuildKey = null;
    return cachedBuildKey;
  }

  try {
    const raw = readFileSync(keyPath, 'utf-8');
    const parsed = JSON.parse(raw) as { buildKey?: string };
    if (parsed.buildKey && /^[a-f0-9]{64}$/.test(parsed.buildKey)) {
      cachedBuildKey = parsed.buildKey;
      return cachedBuildKey;
    }
  } catch (error) {
    console.warn('[KV Client] Failed to read shared/internal-key.json:', error);
  }

  cachedBuildKey = null;
  return cachedBuildKey;
}

/**
 * Set the base URL dynamically from request context
 * 用于在请求上下文中设置 baseUrl
 */
export function setKVBaseUrl(url: string): void {
  // 在 AsyncLocalStorage 中存储 baseUrl
  const store = asyncLocalStorage.getStore();
  if (store !== undefined) {
    // 如果已经在 AsyncLocalStorage 上下文中，无法直接设置
    // 需要通过 runKVOperation 来设置
    console.warn('[KV Client] setKVBaseUrl called within AsyncLocalStorage context');
  }
}

/**
 * Run a KV operation with a specific base URL
 * 在指定的 baseUrl 上下文中运行 KV 操作
 */
export function runKVOperation<T>(baseUrl: string, fn: () => T | Promise<T>): Promise<T> {
  const context: KVRequestContext = {
    baseUrl,
    getCache: new Map<string, unknown>(),
    inflightGets: new Map<string, Promise<unknown>>(),
  };

  return asyncLocalStorage.run(context, async () => {
    return await fn();
  });
}

/**
 * Get the base URL for KV API
 * 优先级：环境变量 KV_BASE_URL > AsyncLocalStorage > 空字符串（同源请求）
 */
function getBaseUrl(): string {
  const envUrl = process.env.KV_BASE_URL;
  
  // 如果环境变量存在且不为空，使用环境变量
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  
  // 从 AsyncLocalStorage 获取
  const context = asyncLocalStorage.getStore();
  if (context?.baseUrl) {
    return context.baseUrl;
  }
  
  // 返回空字符串（同源请求）
  return '';
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

  // 回退：使用构建时生成的密钥（如果存在）
  const buildKey = getBuildKeyFromFile();
  if (buildKey) {
    return buildKey;
  }

  throw new Error('Missing internal key: set INTERNAL_DEBUG_KEY env or provide shared/internal-key.json');
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
 * 统一解析 KV API 响应，避免 HTML/文本响应导致 JSON 解析异常
 */
async function parseKVResponse<T>(res: Response, url: string): Promise<KVResponse<T>> {
  if (typeof res.text === 'function') {
    const text = await res.text();
    try {
      return JSON.parse(text) as KVResponse<T>;
    } catch {
      const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
      throw new Error(
        `KV API returned non-JSON response (status: ${res.status}) from ${url}. Body starts with: ${preview}`
      );
    }
  }

  // 兼容测试环境中的 fetch mock（仅提供 json 方法）
  if (typeof (res as any).json === 'function') {
    return (await (res as any).json()) as KVResponse<T>;
  }

  throw new Error(`KV API response parser is unavailable for ${url}`);
}

/**
 * 调试日志
 */
function debugLog(message: string, ...args: any[]): void {
  if (process.env.DEBUG_KV_URL === 'true') {
    console.log('\x1b[35m[KV Client]\x1b[0m', message, ...args);
  }
}

/**
 * 错误日志（仅在调试模式）
 */
function errorLog(message: string, details: any): void {
  if (process.env.DEBUG_KV_URL === 'true') {
    console.error('\x1b[31m[KV Client Error]\x1b[0m', message);
    console.error('\x1b[31m[KV Client Error]\x1b[0m Details:', JSON.stringify(details, null, 2));
  }
}

/**
 * Create a typed KV client for a specific namespace
 */
function createKVClient<T = unknown>(namespace: string): KVOperations<T> {
  const getCacheKey = (key: string): string => `${namespace}:${key}`;

  return {
    async get<R = T>(key: string): Promise<R | null> {
      const context = asyncLocalStorage.getStore();
      const cacheKey = getCacheKey(key);

      // 请求级复用：命中后直接返回
      if (context?.getCache.has(cacheKey)) {
        return context.getCache.get(cacheKey) as R | null;
      }

      // 请求级并发合并：同 key 并发 GET 只发一次请求
      const existingInflight = context?.inflightGets.get(cacheKey);
      if (existingInflight) {
        return (await existingInflight) as R | null;
      }

      const doFetch = async (): Promise<R | null> => {
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/kv/${namespace}?action=get&key=${encodeURIComponent(key)}`;
        
        debugLog('GET request:', {
          namespace,
          key,
          baseUrl,
          fullUrl: url,
          hasInternalKey: !!getInternalKey(),
        });
        
        try {
          const res = await fetch(url, {
            headers: getAuthHeaders(),
          });

          const data = await parseKVResponse<R>(res, url);

          debugLog('GET response:', {
            namespace,
            key,
            success: data.success,
            hasData: !!data.data,
            error: data.error,
          });
          
          if (!data.success) {
            errorLog('GET failed', {
              baseUrl,
              url,
              key,
              namespace,
              error: data.error,
            });
            throw new Error(data.error || 'KV get failed');
          }
          return data.data ?? null;
        } catch (error) {
          // 捕获 fetch 错误
          if (error instanceof Error && !error.message.includes('KV get failed')) {
            errorLog('GET fetch error', {
              baseUrl,
              url,
              key,
              namespace,
              error: error.message,
              stack: error.stack,
            });
          }
          throw error;
        }
      };

      if (!context) {
        return await doFetch();
      }

      const inflight = doFetch()
        .then((value) => {
          context.getCache.set(cacheKey, value);
          return value;
        })
        .finally(() => {
          context.inflightGets.delete(cacheKey);
        });

      context.inflightGets.set(cacheKey, inflight as Promise<unknown>);
      return (await inflight) as R | null;
    },

    async put<R = T>(key: string, value: R, ttl?: number): Promise<void> {
      const baseUrl = getBaseUrl();
      const context = asyncLocalStorage.getStore();
      const cacheKey = getCacheKey(key);
      const baseUrlWithNamespace = `${baseUrl}/api/kv/${namespace}`;
      const url = `${baseUrlWithNamespace}?action=put`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ key, value, ttl }),
      });
      const data = await parseKVResponse(res, url);
      if (!data.success) {
        throw new Error(data.error || 'KV put failed');
      }

      // 请求内写后读一致性：更新本地复用结果
      context?.inflightGets.delete(cacheKey);
      context?.getCache.set(cacheKey, value as unknown);
    },

    async delete(key: string): Promise<void> {
      const context = asyncLocalStorage.getStore();
      const cacheKey = getCacheKey(key);
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const url = `${baseUrl}?action=delete&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await parseKVResponse(res, url);
      if (!data.success) {
        throw new Error(data.error || 'KV delete failed');
      }

      // 请求内写后读一致性：删除后视为 null
      context?.inflightGets.delete(cacheKey);
      context?.getCache.set(cacheKey, null);
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
      const url = `${baseUrl}?${params}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await parseKVResponse(res, url);
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
