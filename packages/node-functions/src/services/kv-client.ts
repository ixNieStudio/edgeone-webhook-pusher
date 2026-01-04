// KV Client - HTTP wrapper for Edge Functions KV API

const EDGE_API_BASE = process.env.EDGE_API_URL || '';

interface KVResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface KVListResponse {
  success: boolean;
  keys: string[];
  complete: boolean;
  cursor?: string;
}

export class KVClient {
  constructor(private namespace: 'users' | 'messages' | 'channels') {}

  private get baseUrl(): string {
    return `${EDGE_API_BASE}/api/kv/${this.namespace}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const res = await fetch(`${this.baseUrl}?action=get&key=${encodeURIComponent(key)}`);
    const json = (await res.json()) as KVResponse<T>;
    return json.success ? (json.data ?? null) : null;
  }

  async put<T>(key: string, value: T, ttl?: number): Promise<void> {
    await fetch(`${this.baseUrl}?action=put`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, ttl }),
    });
  }

  async delete(key: string): Promise<void> {
    await fetch(`${this.baseUrl}?action=delete&key=${encodeURIComponent(key)}`);
  }

  async list(prefix?: string, limit = 256): Promise<string[]> {
    const params = new URLSearchParams({ action: 'list', limit: String(limit) });
    if (prefix) params.set('prefix', prefix);
    const res = await fetch(`${this.baseUrl}?${params}`);
    const json = (await res.json()) as KVListResponse;
    return json.keys || [];
  }
}

// Export singleton instances
export const usersKV = new KVClient('users');
export const messagesKV = new KVClient('messages');
export const channelsKV = new KVClient('channels');
