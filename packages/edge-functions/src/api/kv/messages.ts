// Edge Function: Messages KV Operations
// Path: /api/kv/messages

interface Env {
  MESSAGES_KV: KVNamespace;
}

interface KVNamespace {
  get(key: string, type: 'json'): Promise<unknown>;
  get(key: string, type?: 'text'): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export async function onRequest(
  request: Request,
  env: Env,
  ctx: { waitUntil: (promise: Promise<unknown>) => void }
): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'get': {
        const key = url.searchParams.get('key');
        if (!key) {
          return Response.json({ success: false, error: 'Missing key parameter' }, { status: 400 });
        }
        const data = await env.MESSAGES_KV.get(key, 'json');
        return Response.json({ success: true, data });
      }

      case 'put': {
        if (request.method !== 'POST') {
          return Response.json({ success: false, error: 'PUT requires POST method' }, { status: 405 });
        }
        const body = (await request.json()) as { key: string; value: unknown; ttl?: number };
        if (!body.key) {
          return Response.json({ success: false, error: 'Missing key in body' }, { status: 400 });
        }
        await env.MESSAGES_KV.put(
          body.key,
          JSON.stringify(body.value),
          body.ttl ? { expirationTtl: body.ttl } : undefined
        );
        return Response.json({ success: true });
      }

      case 'delete': {
        const key = url.searchParams.get('key');
        if (!key) {
          return Response.json({ success: false, error: 'Missing key parameter' }, { status: 400 });
        }
        await env.MESSAGES_KV.delete(key);
        return Response.json({ success: true });
      }

      case 'list': {
        const prefix = url.searchParams.get('prefix') || '';
        const limit = parseInt(url.searchParams.get('limit') || '256', 10);
        const cursor = url.searchParams.get('cursor') || undefined;
        const result = await env.MESSAGES_KV.list({ prefix, limit, cursor });
        return Response.json({
          success: true,
          keys: result.keys.map((k) => k.name),
          complete: result.list_complete,
          cursor: result.cursor,
        });
      }

      default:
        return Response.json(
          { success: false, error: 'Invalid action. Use: get, put, delete, list' },
          { status: 400 }
        );
    }
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
