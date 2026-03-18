import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../kv/new-kv.js';

function createKVBinding() {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  };
}

describe('/api/kv/new-kv', () => {
  beforeEach(() => {
    vi.stubGlobal('PUSHER_KV', createKVBinding());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('supports bulk_get for multiple keys', async () => {
    const kv = (globalThis as any).PUSHER_KV;
    kv.get.mockImplementation(async (key: string) => {
      if (key === 'apps:app:1') {
        return { id: 'app_1', name: 'App One' };
      }

      if (key === 'apps:app:2') {
        return { id: 'app_2', name: 'App Two' };
      }

      return null;
    });

    const response = await onRequest({
      request: new Request('https://example.com/api/kv/new-kv?action=bulk_get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-build-key',
        },
        body: JSON.stringify({
          keys: ['apps:app:1', 'apps:app:2', 'apps:app:missing'],
        }),
      }),
      params: {},
      env: {
        BUILD_KEY: 'test-build-key',
      },
    } as any);

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.values).toEqual({
      'apps:app:1': { id: 'app_1', name: 'App One' },
      'apps:app:2': { id: 'app_2', name: 'App Two' },
      'apps:app:missing': null,
    });
  });

  it('deduplicates repeated keys during bulk_get', async () => {
    const kv = (globalThis as any).PUSHER_KV;
    kv.get.mockResolvedValue({ ok: true });

    const response = await onRequest({
      request: new Request('https://example.com/api/kv/new-kv?action=bulk_get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-build-key',
        },
        body: JSON.stringify({
          keys: ['apps:a:1', 'apps:a:1', 'apps:a:1'],
        }),
      }),
      params: {},
      env: {
        BUILD_KEY: 'test-build-key',
      },
    } as any);

    expect(response.status).toBe(200);
    expect(kv.get).toHaveBeenCalledTimes(1);
  });

  it('supports batch_put', async () => {
    const kv = (globalThis as any).PUSHER_KV;

    const response = await onRequest({
      request: new Request('https://example.com/api/kv/new-kv?action=batch_put', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-build-key',
        },
        body: JSON.stringify({
          entries: [
            { key: 'apps:a:1', value: { id: 'app_1' } },
            { key: 'apps:a:2', value: { id: 'app_2' }, ttl: 60 },
          ],
        }),
      }),
      params: {},
      env: {
        BUILD_KEY: 'test-build-key',
      },
    } as any);

    expect(response.status).toBe(200);
    expect(kv.put).toHaveBeenCalledTimes(2);
    expect(kv.put).toHaveBeenNthCalledWith(1, 'apps:a:1', JSON.stringify({ id: 'app_1' }), {});
    expect(kv.put).toHaveBeenNthCalledWith(2, 'apps:a:2', JSON.stringify({ id: 'app_2' }), { expirationTtl: 60 });
  });

  it('supports batch_delete with deduped keys', async () => {
    const kv = (globalThis as any).PUSHER_KV;

    const response = await onRequest({
      request: new Request('https://example.com/api/kv/new-kv?action=batch_delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-build-key',
        },
        body: JSON.stringify({
          keys: ['apps:a:1', 'apps:a:1', 'apps:a:2'],
        }),
      }),
      params: {},
      env: {
        BUILD_KEY: 'test-build-key',
      },
    } as any);

    expect(response.status).toBe(200);
    expect(kv.delete).toHaveBeenCalledTimes(2);
    expect(kv.delete).toHaveBeenCalledWith('apps:a:1');
    expect(kv.delete).toHaveBeenCalledWith('apps:a:2');
  });
});
