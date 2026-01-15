/**
 * OpenID Management API Routes (nested under Apps)
 * Feature: system-restructure
 *
 * All routes require Admin Token authentication
 */

/**
 * @swagger
 * /apps/{appId}/openids:
 *   parameters:
 *     - name: appId
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *       description: 应用 ID
 *   get:
 *     tags: [OpenIDs]
 *     summary: 获取应用下的 OpenID 列表
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OpenID'
 *       404:
 *         description: 应用不存在
 *   post:
 *     tags: [OpenIDs]
 *     summary: 添加 OpenID
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOpenID'
 *     responses:
 *       201:
 *         description: 添加成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   $ref: '#/components/schemas/OpenID'
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 应用不存在
 *       409:
 *         description: OpenID 已存在
 *
 * /apps/{appId}/openids/{id}:
 *   parameters:
 *     - name: appId
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *       description: 应用 ID
 *     - name: id
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *       description: OpenID 记录 ID
 *   get:
 *     tags: [OpenIDs]
 *     summary: 获取 OpenID 详情
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
 *                   $ref: '#/components/schemas/OpenID'
 *       404:
 *         description: OpenID 不存在
 *   put:
 *     tags: [OpenIDs]
 *     summary: 更新 OpenID
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               remark:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: OpenID 不存在
 *   delete:
 *     tags: [OpenIDs]
 *     summary: 删除 OpenID
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: OpenID 不存在
 */

import { openidService } from '../modules/openid/service.js';
import { appService } from '../modules/app/service.js';
import { withAdminAuth } from '../middleware/admin-auth.js';
import { ErrorCodes, errorResponse as createErrorBody, successResponse, getHttpStatus } from '../shared/error-codes.js';

/**
 * Create JSON response
 * @param {number} status - HTTP status code
 * @param {Object} data - Response data
 * @returns {Response}
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
 * Extract app ID and openid ID from URL path
 * @param {string} pathname
 * @returns {{ appId: string | null, openidId: string | null }}
 */
function extractIds(pathname) {
  // Match /api/apps/:appId/openids/:openidId
  const fullMatch = pathname.match(/\/api\/apps\/([^/]+)\/openids\/([^/]+)/);
  if (fullMatch) {
    return { appId: fullMatch[1], openidId: fullMatch[2] };
  }

  // Match /api/apps/:appId/openids
  const appMatch = pathname.match(/\/api\/apps\/([^/]+)\/openids/);
  if (appMatch) {
    return { appId: appMatch[1], openidId: null };
  }

  return { appId: null, openidId: null };
}

/**
 * GET /api/apps/:appId/openids - Get all OpenIDs for an app
 */
async function handleListOpenIds(context, appId) {
  try {
    // Verify app exists
    const app = await appService.getById(appId);
    if (!app) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'App not found');
    }

    const openids = await openidService.listByApp(appId);
    return jsonResponse(200, successResponse(openids));
  } catch (error) {
    console.error('List openids error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/apps/:appId/openids - Add an OpenID to an app
 */
async function handleCreateOpenId(context, appId) {
  const { request } = context;

  try {
    // Verify app exists
    const app = await appService.getById(appId);
    if (!app) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'App not found');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const openid = await openidService.create(appId, body);
    return jsonResponse(201, successResponse(openid, 'OpenID added successfully'));
  } catch (error) {
    console.error('Create openid error:', error);
    if (error.message.includes('required')) {
      return errorResponse(ErrorCodes.INVALID_PARAM, error.message);
    }
    if (error.message.includes('already exists')) {
      return errorResponse(ErrorCodes.CONFLICT, error.message);
    }
    if (error.message === 'App not found') {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/apps/:appId/openids/:id - Get OpenID by ID
 */
async function handleGetOpenId(context, appId, openidId) {
  try {
    const openid = await openidService.getById(openidId);
    if (!openid) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'OpenID not found');
    }

    // Verify the OpenID belongs to the specified app
    if (openid.appId !== appId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'OpenID not found in this app');
    }

    return jsonResponse(200, successResponse(openid));
  } catch (error) {
    console.error('Get openid error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * PUT /api/apps/:appId/openids/:id - Update OpenID
 */
async function handleUpdateOpenId(context, appId, openidId) {
  const { request } = context;

  try {
    // Verify the OpenID exists and belongs to the app
    const existing = await openidService.getById(openidId);
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'OpenID not found');
    }
    if (existing.appId !== appId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'OpenID not found in this app');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const openid = await openidService.update(openidId, body);
    return jsonResponse(200, successResponse(openid, 'OpenID updated successfully'));
  } catch (error) {
    console.error('Update openid error:', error);
    if (error.message === 'OpenID not found') {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * DELETE /api/apps/:appId/openids/:id - Delete OpenID
 */
async function handleDeleteOpenId(context, appId, openidId) {
  try {
    // Verify the OpenID exists and belongs to the app
    const existing = await openidService.getById(openidId);
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'OpenID not found');
    }
    if (existing.appId !== appId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'OpenID not found in this app');
    }

    await openidService.delete(openidId);
    return jsonResponse(200, successResponse(null, 'OpenID deleted successfully'));
  } catch (error) {
    console.error('Delete openid error:', error);
    if (error.message === 'OpenID not found') {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message);
    }
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      },
    });
  }

  // All openid routes require admin auth
  const handler = async (ctx) => {
    const { appId, openidId } = extractIds(pathname);

    if (!appId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Route not found');
    }

    // Collection routes: /api/apps/:appId/openids
    if (!openidId) {
      switch (request.method) {
        case 'GET':
          return handleListOpenIds(ctx, appId);
        case 'POST':
          return handleCreateOpenId(ctx, appId);
        default:
          return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
      }
    }

    // Resource routes: /api/apps/:appId/openids/:id
    switch (request.method) {
      case 'GET':
        return handleGetOpenId(ctx, appId, openidId);
      case 'PUT':
        return handleUpdateOpenId(ctx, appId, openidId);
      case 'DELETE':
        return handleDeleteOpenId(ctx, appId, openidId);
      default:
        return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }
  };

  return withAdminAuth(handler)(context);
}
