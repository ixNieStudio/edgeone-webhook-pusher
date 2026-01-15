/**
 * Message History API Routes
 * Feature: system-restructure
 *
 * All routes require Admin Token authentication
 */

/**
 * @swagger
 * /messages:
 *   get:
 *     tags: [Messages]
 *     summary: 获取消息历史
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - name: pageSize
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - name: appId
 *         in: query
 *         schema:
 *           type: string
 *         description: 按应用筛选
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       401:
 *         description: 未授权
 *
 * /messages/{id}:
 *   parameters:
 *     - name: id
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *       description: 消息 ID
 *   get:
 *     tags: [Messages]
 *     summary: 获取消息详情
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       404:
 *         description: 消息不存在
 */

import { historyService } from '../modules/history/service.js';
import { withAdminAuth } from '../middleware/admin-auth.js';
import { ErrorCodes, errorResponse as createErrorBody, successResponse, getHttpStatus } from '../shared/error-codes.js';

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
 * Create error response with unified format
 */
function errorResponse(code, message) {
  return jsonResponse(getHttpStatus(code), createErrorBody(code, message));
}

/**
 * Extract ID from URL path
 * @param {string} pathname - URL pathname
 * @returns {string|null}
 */
function extractId(pathname) {
  const match = pathname.match(/\/api\/messages\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/messages - List messages with pagination
 * Query params: type, page, pageSize
 */
async function handleList(context) {
  const { request } = context;
  const url = new URL(request.url);

  try {
    const type = url.searchParams.get('type');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

    // Validate params
    if (type && type !== 'single' && type !== 'topic') {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'type must be "single" or "topic"');
    }

    if (page < 1) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'page must be >= 1');
    }

    if (pageSize < 1 || pageSize > 100) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'pageSize must be between 1 and 100');
    }

    const result = await historyService.list({ type, page, pageSize });

    // Return with standard format plus pagination
    return jsonResponse(200, {
      code: 0,
      message: '成功',
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error) {
    console.error('List messages error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/messages/:id - Get single message
 */
async function handleGet(context, id) {
  try {
    const message = await historyService.get(id);
    if (!message) {
      return errorResponse(ErrorCodes.MESSAGE_NOT_FOUND, 'Message not found');
    }

    return jsonResponse(200, successResponse(message));
  } catch (error) {
    console.error('Get message error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * Main route handler
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      },
    });
  }

  // All message routes require admin auth
  const handler = async (ctx) => {
    const id = extractId(pathname);

    // Only GET method allowed
    if (request.method !== 'GET') {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }

    // Collection route: /api/messages
    if (!id) {
      return handleList(ctx);
    }

    // Item route: /api/messages/:id
    return handleGet(ctx, id);
  };

  return withAdminAuth(handler)(context);
}
