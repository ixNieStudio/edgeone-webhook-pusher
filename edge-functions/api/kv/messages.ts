// Edge Function: Messages KV Operations
// Path: /api/kv/messages
// KV Binding: MESSAGES_KV (configured in edgeone.json)

declare const MESSAGES_KV: KVNamespace;

interface KVNamespace {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: Array<{ name?: string; key?: string }>;
    list_complete?: boolean;
    complete?: boolean;
    cursor?: string;
  }>;
}

interface EventContext {
  request: Request;
  params: Record<string, string>;
  env: Record<string, unknown>;
}

export async function onRequest(context: EventContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  try {
    switch (action) {
      case 'get': {
        const key = url.searchParams.get('key');
        if (!key) {
          return jsonResponse(400, { success: false, error: 'Missing key parameter' });
        }
        const data = await MESSAGES_KV.get(key, 'json');
        return jsonResponse(200, { success: true, data });
      }

      case 'put': {
        if (request.method !== 'POST') {
          return jsonResponse(405, { success: false, error: 'PUT requires POST method' });
        }
        const body = await request.json() as { key?: string; value?: unknown; ttl?: number };
        if (!body.key) {
          return jsonResponse(400, { success: false, error: 'Missing key in body' });
        }
        await MESSAGES_KV.put(
          body.key,
          JSON.stringify(body.value),
          body.ttl ? { expirationTtl: body.ttl } : undefined
        );
        return jsonResponse(200, { success: true });
      }

      case 'delete': {
        const key = url.searchParams.get('key');
        if (!key) {
          return jsonResponse(400, { success: false, error: 'Missing key parameter' });
        }
        await MESSAGES_KV.delete(key);
        return jsonResponse(200, { success: true });
      }

      case 'list': {
        const prefix = url.searchParams.get('prefix') || '';
        const limit = parseInt(url.searchParams.get('limit') || '256', 10);
        const cursor = url.searchParams.get('cursor') || undefined;
        const result = await MESSAGES_KV.list({ prefix, limit, cursor });
        return jsonResponse(200, {
          success: true,
          keys: result.keys.map((k) => k.name || k.key),
          complete: result.list_complete || result.complete,
          cursor: result.cursor,
        });
      }

      default:
        return jsonResponse(400, {
          success: false,
          error: 'Invalid action. Use: get, put, delete, list',
        });
    }
  } catch (error) {
    console.error('KV Error:', error);
    return jsonResponse(500, { success: false, error: String(error) });
  }
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...corsHeaders(),
    },
  });
}
