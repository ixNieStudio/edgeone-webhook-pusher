// Edge Function: Config KV Operations
// Path: /api/kv/config
// KV Binding: CONFIG_KV (configured in EdgeOne Pages)

// BUILD_KEY 在构建时被替换为实际值
const BUILD_KEY = '2722d2d41fd469f109f2bde721e01fd18526323e53e78e88684ddc6c77f30f6c';

/**
 * 验证内部 API 密钥
 * @param {string|null} key - 请求中的密钥
 * @param {Object} env - 环境变量
 * @returns {boolean} 是否有效
 */
function isValidKey(key, env) {
  if (!key) return false;

  // Build Key 验证
  if (key === BUILD_KEY) return true;

  // Debug Key 验证（如果配置）
  const debugKey = env?.INTERNAL_DEBUG_KEY;
  if (debugKey && debugKey.length === 64 && key === debugKey) return true;

  return false;
}

/**
 * Handle KV operations for application config
 * @param {Object} context - EdgeOne EventContext
 * @param {Request} context.request - Client request object
 * @param {Object} context.params - Dynamic routing parameters
 * @param {Object} context.env - Pages environment variables
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // ===== 密钥验证 =====
  const internalKey = request.headers.get('X-Internal-Key');
  if (!isValidKey(internalKey, env)) {
    return jsonResponse(403, { success: false, error: 'Unauthorized' });
  }
  // ===== 验证结束 =====

  try {
    switch (action) {
      case 'get': {
        const key = url.searchParams.get('key');
        if (!key) {
          return jsonResponse(400, { success: false, error: 'Missing key parameter' });
        }
        const data = await CONFIG_KV.get(key, 'json');
        return jsonResponse(200, { success: true, data });
      }

      case 'put': {
        if (request.method !== 'POST') {
          return jsonResponse(405, { success: false, error: 'PUT requires POST method' });
        }
        const body = await request.json();
        if (!body.key) {
          return jsonResponse(400, { success: false, error: 'Missing key in body' });
        }
        if (body.value === undefined) {
          return jsonResponse(400, { success: false, error: 'Missing value in body' });
        }
        const options = body.ttl ? { expirationTtl: body.ttl } : {};
        await CONFIG_KV.put(body.key, JSON.stringify(body.value), options);
        return jsonResponse(200, { success: true });
      }

      case 'delete': {
        const key = url.searchParams.get('key');
        if (!key) {
          return jsonResponse(400, { success: false, error: 'Missing key parameter' });
        }
        await CONFIG_KV.delete(key);
        return jsonResponse(200, { success: true });
      }

      case 'list': {
        const prefix = url.searchParams.get('prefix') || '';
        const limit = parseInt(url.searchParams.get('limit') || '256', 10);
        const cursorParam = url.searchParams.get('cursor');
        // Only pass cursor if it's a non-empty string
        const listOptions = { prefix, limit };
        if (cursorParam && cursorParam.length > 0) {
          listOptions.cursor = cursorParam;
        }
        const result = await CONFIG_KV.list(listOptions);
        return jsonResponse(200, {
          success: true,
          keys: result.keys.map((k) => k.name || k.key),
          complete: result.list_complete || result.complete,
          cursor: result.cursor || undefined,
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

/**
 * Generate CORS headers
 * @returns {Object}
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Internal-Key',
  };
}

/**
 * Create JSON response with CORS headers
 * @param {number} status - HTTP status code
 * @param {Object} data - Response data
 * @returns {Response}
 */
function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...corsHeaders(),
    },
  });
}
