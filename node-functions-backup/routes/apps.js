/**
 * App Management API Routes
 * Feature: system-restructure
 *
 * All routes require Admin Token authentication
 */

/**
 * @swagger
 * /apps:
 *   get:
 *     tags: [Apps]
 *     summary: 获取应用列表
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
 *                     $ref: '#/components/schemas/App'
 *       401:
 *         description: 未授权
 *   post:
 *     tags: [Apps]
 *     summary: 创建应用
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApp'
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   $ref: '#/components/schemas/App'
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 渠道不存在
 *
 * /apps/{id}:
 *   parameters:
 *     - name: id
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *       description: 应用 ID
 *   get:
 *     tags: [Apps]
 *     summary: 获取应用详情
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
 *                   $ref: '#/components/schemas/App'
 *       404:
 *         description: 应用不存在
 *   put:
 *     tags: [Apps]
 *     summary: 更新应用
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
 *               name:
 *                 type: string
 *               templateId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 应用不存在
 *   delete:
 *     tags: [Apps]
 *     summary: 删除应用
 *     description: 删除应用时会同时删除所有绑定的 OpenID
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 应用不存在
 */

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
 * Extract app ID from URL path
 * @param {string} pathname
 * @returns {string | null}
 */
function extractAppId(pathname) {
  const match = pathname.match(/\/api\/apps\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/apps - Get all apps
 */
async function handleListApps(context) {
  try {
    const apps = await appService.list();
    
    // Add openIdCount to each app
    const appsWithCount = await Promise.all(
      apps.map(async (app) => ({
        ...app,
        openIdCount: await appService.getOpenIDCount(app.id),
      }))
    );
    
    return jsonResponse(200, successResponse(appsWithCount));
  } catch (error) {
    console.error('List apps error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/apps - Create an app
 */
async function handleCreateApp(context) {
  const { request } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const app = await appService.create(body);
    return jsonResponse(201, successResponse(app, 'App created successfully'));
  } catch (error) {
    console.error('Create app error:', error);
    if (error.message.includes('required') || error.message.includes('must be')) {
      return errorResponse(ErrorCodes.INVALID_PARAM, error.message);
    }
    if (error.message === 'Channel not found') {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/apps/:id - Get app by ID
 */
async function handleGetApp(context, appId) {
  try {
    const app = await appService.getById(appId);
    if (!app) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'App not found');
    }
    
    // Add openIdCount
    const openIdCount = await appService.getOpenIDCount(appId);
    
    return jsonResponse(200, successResponse({ ...app, openIdCount }));
  } catch (error) {
    console.error('Get app error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * PUT /api/apps/:id - Update app
 */
async function handleUpdateApp(context, appId) {
  const { request } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const app = await appService.update(appId, body);
    return jsonResponse(200, successResponse(app, 'App updated successfully'));
  } catch (error) {
    console.error('Update app error:', error);
    if (error.message === 'App not found') {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message);
    }
    if (error.message.includes('cannot be empty') || error.message.includes('required') || error.message.includes('must be')) {
      return errorResponse(ErrorCodes.INVALID_PARAM, error.message);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * DELETE /api/apps/:id - Delete app
 */
async function handleDeleteApp(context, appId) {
  try {
    await appService.delete(appId);
    return jsonResponse(200, successResponse(null, 'App deleted successfully'));
  } catch (error) {
    console.error('Delete app error:', error);
    if (error.message === 'App not found') {
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

  // All app routes require admin auth
  const handler = async (ctx) => {
    const appId = extractAppId(pathname);

    // Check if this is an openids sub-route (handled by openids.js)
    if (pathname.includes('/openids')) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Route not found');
    }

    // Collection routes: /api/apps
    if (!appId || pathname.endsWith('/apps') || pathname.endsWith('/apps/')) {
      switch (request.method) {
        case 'GET':
          return handleListApps(ctx);
        case 'POST':
          return handleCreateApp(ctx);
        default:
          return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
      }
    }

    // Resource routes: /api/apps/:id
    switch (request.method) {
      case 'GET':
        return handleGetApp(ctx, appId);
      case 'PUT':
        return handleUpdateApp(ctx, appId);
      case 'DELETE':
        return handleDeleteApp(ctx, appId);
      default:
        return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }
  };

  return withAdminAuth(handler)(context);
}
