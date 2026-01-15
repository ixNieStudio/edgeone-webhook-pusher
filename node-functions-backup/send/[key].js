/**
 * Webhook Push Route
 * Feature: system-restructure
 *
 * URL: /{appKey}.send
 * Methods: GET, POST
 * 
 * GET: Query params - title (required), desp (optional)
 * POST: JSON body - { title, desp, data }
 *
 * No authentication required - validates App Key existence
 */

/**
 * @swagger
 * /{appKey}.send:
 *   parameters:
 *     - name: appKey
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *       description: 应用 Key (APK...)
 *   get:
 *     tags: [Webhook]
 *     summary: 发送消息 (GET)
 *     description: 通过 URL 参数发送消息
 *     parameters:
 *       - name: title
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 消息标题
 *       - name: desp
 *         in: query
 *         schema:
 *           type: string
 *         description: 消息内容
 *     responses:
 *       200:
 *         description: 发送成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   $ref: '#/components/schemas/PushResult'
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 应用不存在
 *   post:
 *     tags: [Webhook]
 *     summary: 发送消息 (POST)
 *     description: 通过 JSON Body 发送消息
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: 消息标题
 *               desp:
 *                 type: string
 *                 description: 消息内容
 *     responses:
 *       200:
 *         description: 发送成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   $ref: '#/components/schemas/PushResult'
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 应用不存在
 */

import { pushService } from '../modules/push/service.js';
import { setKVBaseUrl } from '../shared/kv-client.js';
import { ErrorCodes, ErrorMessages } from '../shared/types.js';

/**
 * Create JSON response
 */
function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Create error response
 */
function errorResponse(status, code, message) {
  return jsonResponse(status, {
    code,
    message: message || ErrorMessages[code] || 'Unknown error',
    data: null,
  });
}

/**
 * Create success response
 */
function successResponse(data) {
  return jsonResponse(200, {
    code: 0,
    message: 'success',
    data,
  });
}

/**
 * Extract App Key from URL path
 * Supports: /APKxxx.send or /send/APKxxx
 * @param {string} pathname
 * @returns {string|null}
 */
function extractAppKey(pathname) {
  // Pattern: /:appKey.send
  const dotMatch = pathname.match(/\/([^/]+)\.send$/);
  if (dotMatch) {
    return dotMatch[1];
  }

  // Pattern: /send/:appKey
  const slashMatch = pathname.match(/\/send\/([^/]+)/);
  if (slashMatch) {
    return slashMatch[1];
  }

  return null;
}

/**
 * Parse message from request
 * @param {Request} request
 * @param {URL} url
 * @returns {Promise<{ title?: string, desp?: string, data?: object }>}
 */
async function parseMessage(request, url) {
  if (request.method === 'GET') {
    // GET: 从 query params 获取
    return {
      title: url.searchParams.get('title'),
      desp: url.searchParams.get('desp'),
    };
  }

  if (request.method === 'POST') {
    // POST: 从 JSON body 获取
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const body = await request.json();
        return {
          title: body.title,
          desp: body.desp,
          data: body.data,
        };
      }
      
      // 支持 form-urlencoded
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        return {
          title: params.get('title'),
          desp: params.get('desp'),
        };
      }

      // 默认尝试解析为 JSON
      const body = await request.json();
      return {
        title: body.title,
        desp: body.desp,
        data: body.data,
      };
    } catch (e) {
      return {};
    }
  }

  return {};
}

/**
 * Map error message to HTTP status
 */
function getHttpStatus(errorMsg) {
  if (errorMsg === 'App not found') return 404;
  if (errorMsg === 'No OpenIDs bound to this app') return 400;
  if (errorMsg === 'Channel not found') return 500;
  if (errorMsg === 'Failed to get access token') return 500;
  return 500;
}

/**
 * Main route handler
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Set KV base URL from request context
  setKVBaseUrl(url.origin);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only allow GET and POST
  if (request.method !== 'GET' && request.method !== 'POST') {
    return errorResponse(405, ErrorCodes.INVALID_PARAM, 'Method not allowed. Use GET or POST.');
  }

  // Extract App Key from URL
  const appKey = extractAppKey(pathname);
  if (!appKey) {
    return errorResponse(400, ErrorCodes.INVALID_PARAM, 'Invalid URL format');
  }

  // Parse message from request
  const message = await parseMessage(request, url);

  // Validate title
  if (!message.title) {
    return errorResponse(400, ErrorCodes.MISSING_TITLE, 'Missing required field: title');
  }

  // Push message
  try {
    const result = await pushService.push(appKey, message);

    if (result.error) {
      return errorResponse(getHttpStatus(result.error), ErrorCodes.INTERNAL_ERROR, result.error);
    }

    return successResponse({
      pushId: result.pushId,
      total: result.total,
      success: result.success,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error('Push error:', error);
    return errorResponse(500, ErrorCodes.INTERNAL_ERROR, error.message);
  }
}
