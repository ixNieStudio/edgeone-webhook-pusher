/**
 * KV Client - Wrapper for Edge Functions KV API
 * Calls the Edge Functions to perform KV operations
 * 
 * 架构说明：
 * Node Functions 无法直接访问 EdgeOne KV，需要通过 Edge Functions 代理
 * Edge Functions 位于 edge-functions/api/kv/new-kv.js（统一入口 /api/kv/new-kv）
 * 
 * 安全说明：
 * 所有请求都需要携带 X-Internal-Key header 进行认证
 * 统一使用 BUILD_KEY 环境变量提供密钥
 * - 口令格式不做运行时校验，只要求非空且两端保持一致
 * 
 * 优先使用环境变量 KV_BASE_URL，生产环境留空使用同源请求
 */

import { AsyncLocalStorage } from 'async_hooks';
import { getLegacyKVKey, getLegacyKVPrefix, normalizeLegacyKVKey } from '../types/constants.js';

interface KVRequestContext {
  baseUrl: string;
  // 同一次请求内的 GET 结果复用，减少重复 KV HTTP 请求
  getCache: Map<string, unknown>;
  // 同一 key 并发读取时做请求合并
  inflightGets: Map<string, Promise<unknown>>;
}

// AsyncLocalStorage for storing per-request KV context
const asyncLocalStorage = new AsyncLocalStorage<KVRequestContext>();

function getEnvInternalKey(): string | null {
  const key = process.env.BUILD_KEY;
  if (typeof key === 'string' && key.trim().length > 0) {
    return key;
  }

  return null;
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
 * 统一从 BUILD_KEY 环境变量读取
 * - 只要求密钥非空，不限制具体格式
 */
export function getInternalKey(): string {
  const envKey = getEnvInternalKey();
  if (envKey) {
    return envKey;
  }

  throw new Error('Missing internal key: set BUILD_KEY env');
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
  getMany<R = T>(keys: string[]): Promise<Record<string, R | null>>;
  put<R = T>(key: string, value: R, ttl?: number): Promise<void>;
  putMany<R = T>(entries: Array<{ key: string; value: R; ttl?: number }>): Promise<void>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
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
  values?: Record<string, T | null>;
  keys?: string[];
  complete?: boolean;
  cursor?: string;
  error?: string;
}

interface KVPutEntry<T = unknown> {
  key: string;
  value: T;
  ttl?: number;
}

const BATCH_WRITE_LIMIT = 100;

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
 * Create a typed KV client for a specific namespace prefix
 */
function createKVClient<T = unknown>(namespace: string): KVOperations<T> {
  const namespacePrefix = `${namespace}:`;
  const getCacheKey = (key: string): string => `${namespace}:${key}`;
  const applyNamespacePrefix = (value: string): string =>
    value.startsWith(namespacePrefix) ? value : `${namespacePrefix}${value}`;
  const stripNamespacePrefix = (value: string): string =>
    value.startsWith(namespacePrefix) ? value.slice(namespacePrefix.length) : value;
  const applyLegacyNamespacePrefix = (value: string): string => {
    const legacyKey = getLegacyKVKey(value);
    return legacyKey ? applyNamespacePrefix(legacyKey) : '';
  };
  const createBulkGetRequest = async <R = T>(
    namespacedKeys: string[],
    baseUrl: string
  ): Promise<Record<string, R | null>> => {
    const url = `${baseUrl}/api/kv/new-kv?action=bulk_get`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ keys: namespacedKeys }),
    });
    const data = await parseKVResponse<R>(res, url);
    if (!data.success) {
      throw new Error(data.error || 'KV bulk get failed');
    }

    return (data.values || {}) as Record<string, R | null>;
  };

  return {
    async get<R = T>(key: string): Promise<R | null> {
      const context = asyncLocalStorage.getStore();
      const cacheKey = getCacheKey(key);
      const namespacedKey = applyNamespacePrefix(key);

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
        const url = `${baseUrl}/api/kv/new-kv?action=get&key=${encodeURIComponent(namespacedKey)}`;
        
        debugLog('GET request:', {
          namespace,
          key,
          namespacedKey,
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

          if (data.data !== null && data.data !== undefined) {
            return data.data;
          }

          const legacyNamespacedKey = applyLegacyNamespacePrefix(key);
          if (!legacyNamespacedKey) {
            return null;
          }

          const legacyUrl = `${baseUrl}/api/kv/new-kv?action=get&key=${encodeURIComponent(legacyNamespacedKey)}`;
          const legacyRes = await fetch(legacyUrl, {
            headers: getAuthHeaders(),
          });
          const legacyData = await parseKVResponse<R>(legacyRes, legacyUrl);
          if (!legacyData.success) {
            throw new Error(legacyData.error || 'KV legacy get failed');
          }

          return legacyData.data ?? null;
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

    async getMany<R = T>(keys: string[]): Promise<Record<string, R | null>> {
      if (keys.length === 0) {
        return {};
      }

      const context = asyncLocalStorage.getStore();
      const result: Record<string, R | null> = {};
      const pendingKeys: string[] = [];
      const pendingInflight: Array<Promise<void>> = [];

      for (const key of keys) {
        const cacheKey = getCacheKey(key);

        if (context?.getCache.has(cacheKey)) {
          result[key] = context.getCache.get(cacheKey) as R | null;
          continue;
        }

        const existingInflight = context?.inflightGets.get(cacheKey);
        if (existingInflight) {
          pendingInflight.push(existingInflight.then((value) => {
            result[key] = value as R | null;
          }));
          continue;
        }

        pendingKeys.push(key);
      }

      if (pendingInflight.length > 0) {
        await Promise.all(pendingInflight);
      }

      if (pendingKeys.length === 0) {
        return result;
      }

      const namespacedKeys = pendingKeys.map(applyNamespacePrefix);
      const baseUrl = getBaseUrl();
      const request = async (): Promise<Record<string, R | null>> => {
        const values = await createBulkGetRequest<R>(namespacedKeys, baseUrl);
        const resolved: Record<string, R | null> = {};
        const missingLegacyMap = new Map<string, string>();
        const legacyToCurrent = new Map<string, string[]>();

        pendingKeys.forEach((key, index) => {
          const namespacedKey = namespacedKeys[index];
          const value = (values[namespacedKey] ?? null) as R | null;
          if (value !== null) {
            resolved[key] = value;
            context?.getCache.set(getCacheKey(key), value as unknown);
            return;
          }

          const legacyKey = getLegacyKVKey(key);
          if (!legacyKey) {
            resolved[key] = null;
            context?.getCache.set(getCacheKey(key), null);
            return;
          }

          const legacyNamespacedKey = applyNamespacePrefix(legacyKey);
          missingLegacyMap.set(key, legacyNamespacedKey);
          const currentKeys = legacyToCurrent.get(legacyNamespacedKey) || [];
          currentKeys.push(key);
          legacyToCurrent.set(legacyNamespacedKey, currentKeys);
        });

        if (missingLegacyMap.size > 0) {
          const legacyValues = await createBulkGetRequest<R>(Array.from(legacyToCurrent.keys()), baseUrl);
          for (const [legacyNamespacedKey, currentKeys] of legacyToCurrent.entries()) {
            const value = (legacyValues[legacyNamespacedKey] ?? null) as R | null;
            currentKeys.forEach((currentKey) => {
              resolved[currentKey] = value;
              context?.getCache.set(getCacheKey(currentKey), value as unknown);
            });
          }
        }

        for (const key of pendingKeys) {
          if (!(key in resolved)) {
            resolved[key] = null;
            context?.getCache.set(getCacheKey(key), null);
          }
        }

        return resolved;
      };

      if (!context) {
        Object.assign(result, await request());
        return result;
      }

      const inflight = request().finally(() => {
        pendingKeys.forEach((key) => context.inflightGets.delete(getCacheKey(key)));
      });

      pendingKeys.forEach((key) => {
        context.inflightGets.set(
          getCacheKey(key),
          inflight.then((resolved) => resolved[key] as unknown)
        );
      });

      Object.assign(result, await inflight);
      return result;
    },

    async put<R = T>(key: string, value: R, ttl?: number): Promise<void> {
      const baseUrl = getBaseUrl();
      const context = asyncLocalStorage.getStore();
      const cacheKey = getCacheKey(key);
      const namespacedKey = applyNamespacePrefix(key);
      const url = `${baseUrl}/api/kv/new-kv?action=put`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ key: namespacedKey, value, ttl }),
      });
      const data = await parseKVResponse(res, url);
      if (!data.success) {
        throw new Error(data.error || 'KV put failed');
      }

      // 请求内写后读一致性：更新本地复用结果
      context?.inflightGets.delete(cacheKey);
      context?.getCache.set(cacheKey, value as unknown);
    },

    async putMany<R = T>(entries: Array<KVPutEntry<R>>): Promise<void> {
      if (entries.length === 0) {
        return;
      }

      const context = asyncLocalStorage.getStore();
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/kv/new-kv?action=batch_put`;
      for (let start = 0; start < entries.length; start += BATCH_WRITE_LIMIT) {
        const chunk = entries.slice(start, start + BATCH_WRITE_LIMIT);
        const payload = chunk.map(({ key, value, ttl }) => ({
          key: applyNamespacePrefix(key),
          value,
          ttl,
        }));
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ entries: payload }),
        });
        const data = await parseKVResponse(res, url);
        if (!data.success) {
          throw new Error(data.error || 'KV batch put failed');
        }

        chunk.forEach(({ key, value }) => {
          const cacheKey = getCacheKey(key);
          context?.inflightGets.delete(cacheKey);
          context?.getCache.set(cacheKey, value as unknown);
        });
      }
    },

    async delete(key: string): Promise<void> {
      const context = asyncLocalStorage.getStore();
      const cacheKey = getCacheKey(key);
      const namespacedKey = applyNamespacePrefix(key);
      const baseUrl = `${getBaseUrl()}/api/kv/new-kv`;
      const url = `${baseUrl}?action=delete&key=${encodeURIComponent(namespacedKey)}`;
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

      const legacyKey = getLegacyKVKey(key);
      if (legacyKey && legacyKey !== key) {
        const legacyUrl = `${baseUrl}?action=delete&key=${encodeURIComponent(applyNamespacePrefix(legacyKey))}`;
        const legacyRes = await fetch(legacyUrl, {
          headers: getAuthHeaders(),
        });
        const legacyData = await parseKVResponse(legacyRes, legacyUrl);
        if (!legacyData.success) {
          throw new Error(legacyData.error || 'KV legacy delete failed');
        }
      }
    },

    async deleteMany(keys: string[]): Promise<void> {
      if (keys.length === 0) {
        return;
      }

      const context = asyncLocalStorage.getStore();
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/kv/new-kv?action=batch_delete`;
      const payloadKeys = Array.from(new Set(
        keys.flatMap((key) => {
          const next = [applyNamespacePrefix(key)];
          const legacyKey = getLegacyKVKey(key);
          if (legacyKey && legacyKey !== key) {
            next.push(applyNamespacePrefix(legacyKey));
          }
          return next;
        })
      ));

      for (let start = 0; start < payloadKeys.length; start += BATCH_WRITE_LIMIT) {
        const chunk = payloadKeys.slice(start, start + BATCH_WRITE_LIMIT);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ keys: chunk }),
        });
        const data = await parseKVResponse(res, url);
        if (!data.success) {
          throw new Error(data.error || 'KV batch delete failed');
        }
      }

      keys.forEach((key) => {
        const cacheKey = getCacheKey(key);
        context?.inflightGets.delete(cacheKey);
        context?.getCache.set(cacheKey, null);
      });
    },

    async list(prefix = '', limit = 256, cursor?: string): Promise<KVListResult> {
      const baseUrl = `${getBaseUrl()}/api/kv/new-kv`;
      const namespacedPrefix = applyNamespacePrefix(prefix);
      const params = new URLSearchParams({
        action: 'list',
        prefix: namespacedPrefix,
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

      const currentKeys = (data.keys || []).map(stripNamespacePrefix);
      if (currentKeys.length > 0 || cursor) {
        return {
          keys: currentKeys,
          complete: data.complete ?? true,
          cursor: data.cursor,
        };
      }

      const legacyPrefix = getLegacyKVPrefix(prefix);
      if (!legacyPrefix || legacyPrefix === prefix) {
        return {
          keys: currentKeys,
          complete: data.complete ?? true,
          cursor: data.cursor,
        };
      }

      const legacyParams = new URLSearchParams({
        action: 'list',
        prefix: applyNamespacePrefix(legacyPrefix),
        limit: String(limit),
      });
      const legacyUrl = `${baseUrl}?${legacyParams}`;
      const legacyRes = await fetch(legacyUrl, {
        headers: getAuthHeaders(),
      });
      const legacyData = await parseKVResponse(legacyRes, legacyUrl);
      if (!legacyData.success) {
        throw new Error(legacyData.error || 'KV legacy list failed');
      }

      return {
        keys: (legacyData.keys || []).map(stripNamespacePrefix).map(normalizeLegacyKVKey),
        complete: legacyData.complete ?? true,
        cursor: legacyData.cursor,
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
