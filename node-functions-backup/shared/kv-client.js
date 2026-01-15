/**
 * KV Client - Wrapper for Edge Functions KV API
 * Calls the Edge Functions to perform KV operations
 * 
 * 架构说明：
 * Node Functions 无法直接访问 EdgeOne KV，需要通过 Edge Functions 代理
 * Edge Functions 位于 edge-functions/api/kv/ 目录
 * 
 * 本地调试：
 * edgeone pages dev 会在 8088 端口同时运行 Edge Functions 和 Node Functions
 * KV 存储会被自动模拟，无需额外配置
 * 如需使用远程 KV，运行 edgeone pages link 关联项目
 */

// Store for dynamic base URL (set from request context)
let dynamicBaseUrl = null;

/**
 * Set the base URL dynamically from request context
 * @param {string} url - The base URL to use
 */
export function setKVBaseUrl(url) {
  dynamicBaseUrl = url;
}

/**
 * Get the current base URL
 * @returns {string}
 */
function getBaseUrl() {
  return dynamicBaseUrl || '';
}

/**
 * Create a KV client for a specific namespace
 * @param {string} namespace - KV namespace (config, channels, apps, openids, messages)
 * @returns {Object}
 */
function createKVClient(namespace) {
  return {
    /**
     * Get value by key
     * @param {string} key
     * @returns {Promise<any>}
     */
    async get(key) {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const res = await fetch(`${baseUrl}?action=get&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV get failed');
      }
      return data.data;
    },

    /**
     * Put value by key
     * @param {string} key
     * @param {any} value
     * @param {number} [ttl] - Time to live in seconds
     * @returns {Promise<void>}
     */
    async put(key, value, ttl) {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const res = await fetch(`${baseUrl}?action=put`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ttl }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV put failed');
      }
    },

    /**
     * Delete value by key
     * @param {string} key
     * @returns {Promise<void>}
     */
    async delete(key) {
      const baseUrl = `${getBaseUrl()}/api/kv/${namespace}`;
      const res = await fetch(`${baseUrl}?action=delete&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV delete failed');
      }
    },

    /**
     * List keys with prefix
     * @param {string} [prefix]
     * @param {number} [limit]
     * @param {string} [cursor]
     * @returns {Promise<{ keys: string[], complete: boolean, cursor?: string }>}
     */
    async list(prefix = '', limit = 256, cursor) {
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
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV list failed');
      }
      return {
        keys: data.keys || [],
        complete: data.complete ?? true,
        cursor: data.cursor,
      };
    },

    /**
     * List all keys with prefix (handles pagination)
     * @param {string} [prefix]
     * @returns {Promise<string[]>}
     */
    async listAll(prefix = '') {
      const allKeys = [];
      let cursor;
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

// Export KV clients for each namespace
export const configKV = createKVClient('config');
export const channelsKV = createKVClient('channels');
export const appsKV = createKVClient('apps');
export const openidsKV = createKVClient('openids');
export const messagesKV = createKVClient('messages');
