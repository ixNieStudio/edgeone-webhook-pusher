/**
 * Initialization API Routes
 * Feature: system-restructure
 */

/**
 * @swagger
 * /init/status:
 *   get:
 *     tags: [Init]
 *     summary: 检查初始化状态
 *     description: 检查系统是否已初始化
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
 *                   type: object
 *                   properties:
 *                     initialized:
 *                       type: boolean
 *
 * /init:
 *   post:
 *     tags: [Init]
 *     summary: 初始化系统
 *     description: 首次初始化系统，生成 Admin Token。只能执行一次。
 *     responses:
 *       200:
 *         description: 初始化成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   type: object
 *                   properties:
 *                     adminToken:
 *                       type: string
 *                       description: 管理员令牌，请妥善保存
 *       400:
 *         description: 系统已初始化
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { authService } from '../services/auth.js';
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
 * GET /api/init/status - Check initialization status
 * No authentication required
 */
export async function handleGetStatus(context) {
  try {
    const status = await authService.getStatus();
    return jsonResponse(200, successResponse(status));
  } catch (error) {
    console.error('Get init status error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/init - Execute initialization
 * No authentication required (only works when not initialized)
 */
export async function handleInit(context) {
  const { request } = context;

  try {
    // Check if already initialized
    const isInit = await authService.isInitialized();
    if (isInit) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Application is already initialized');
    }

    // Parse optional WeChat config from body
    let wechatConfig = null;
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        if (body.wechat) {
          wechatConfig = body.wechat;
        }
      } catch {
        // Ignore JSON parse errors, proceed without wechat config
      }
    }

    // Initialize
    const result = await authService.initialize(wechatConfig);

    return jsonResponse(200, successResponse(
      { adminToken: result.adminToken },
      'Initialization successful. Please save your Admin Token securely.'
    ));
  } catch (error) {
    console.error('Init error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * Main route handler
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      },
    });
  }

  // Route: GET /api/init/status
  if (path.endsWith('/status') && request.method === 'GET') {
    return handleGetStatus(context);
  }

  // Route: POST /api/init
  if (request.method === 'POST') {
    return handleInit(context);
  }

  // Method not allowed
  return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
}
