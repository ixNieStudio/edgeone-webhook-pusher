/**
 * Channel Management API Routes
 * Feature: system-restructure
 *
 * All routes require Admin Token authentication
 */

/**
 * @swagger
 * /channels:
 *   get:
 *     tags: [Channels]
 *     summary: 获取渠道列表
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
 *                     $ref: '#/components/schemas/Channel'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags: [Channels]
 *     summary: 创建渠道
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChannel'
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
 *                   $ref: '#/components/schemas/Channel'
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *
 * /channels/{id}:
 *   parameters:
 *     - name: id
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *       description: 渠道 ID
 *   get:
 *     tags: [Channels]
 *     summary: 获取渠道详情
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
 *                   $ref: '#/components/schemas/Channel'
 *       404:
 *         description: 渠道不存在
 *   put:
 *     tags: [Channels]
 *     summary: 更新渠道
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
 *               config:
 *                 type: object
 *                 properties:
 *                   appId:
 *                     type: string
 *                   appSecret:
 *                     type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 渠道不存在
 *   delete:
 *     tags: [Channels]
 *     summary: 删除渠道
 *     description: 如果有应用引用此渠道，将无法删除
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 渠道不存在
 *       409:
 *         description: 渠道被引用，无法删除
 */

import { channelService } from '../modules/channel/service.js';
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
 * Extract channel ID from URL path
 * @param {string} pathname
 * @returns {string | null}
 */
function extractChannelId(pathname) {
  const match = pathname.match(/\/api\/channels\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/channels - Get all channels
 */
async function handleListChannels(context) {
  try {
    const channels = await channelService.list();
    // Mask sensitive fields
    const maskedChannels = channels.map((ch) => channelService.maskChannel(ch));
    return jsonResponse(200, successResponse(maskedChannels));
  } catch (error) {
    console.error('List channels error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/channels - Create a channel
 */
async function handleCreateChannel(context) {
  const { request } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const channel = await channelService.create(body);
    const maskedChannel = channelService.maskChannel(channel);
    return jsonResponse(201, successResponse(maskedChannel, 'Channel created successfully'));
  } catch (error) {
    console.error('Create channel error:', error);
    if (error.message.includes('required')) {
      return errorResponse(ErrorCodes.INVALID_PARAM, error.message);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/channels/:id - Get channel by ID
 */
async function handleGetChannel(context, channelId) {
  try {
    const channel = await channelService.getById(channelId);
    if (!channel) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Channel not found');
    }
    const maskedChannel = channelService.maskChannel(channel);
    return jsonResponse(200, successResponse(maskedChannel));
  } catch (error) {
    console.error('Get channel error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * PUT /api/channels/:id - Update channel
 */
async function handleUpdateChannel(context, channelId) {
  const { request } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const channel = await channelService.update(channelId, body);
    const maskedChannel = channelService.maskChannel(channel);
    return jsonResponse(200, successResponse(maskedChannel, 'Channel updated successfully'));
  } catch (error) {
    console.error('Update channel error:', error);
    if (error.message === 'Channel not found') {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message);
    }
    if (error.message.includes('cannot be empty')) {
      return errorResponse(ErrorCodes.INVALID_PARAM, error.message);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * DELETE /api/channels/:id - Delete channel
 */
async function handleDeleteChannel(context, channelId) {
  try {
    await channelService.delete(channelId);
    return jsonResponse(200, successResponse(null, 'Channel deleted successfully'));
  } catch (error) {
    console.error('Delete channel error:', error);
    if (error.message === 'Channel not found') {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message);
    }
    if (error.message.includes('referenced')) {
      return errorResponse(ErrorCodes.REFERENCE_EXISTS, error.message);
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

  // All channel routes require admin auth
  const handler = async (ctx) => {
    const channelId = extractChannelId(pathname);

    // Collection routes: /api/channels
    if (!channelId || pathname.endsWith('/channels') || pathname.endsWith('/channels/')) {
      switch (request.method) {
        case 'GET':
          return handleListChannels(ctx);
        case 'POST':
          return handleCreateChannel(ctx);
        default:
          return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
      }
    }

    // Resource routes: /api/channels/:id
    switch (request.method) {
      case 'GET':
        return handleGetChannel(ctx, channelId);
      case 'PUT':
        return handleUpdateChannel(ctx, channelId);
      case 'DELETE':
        return handleDeleteChannel(ctx, channelId);
      default:
        return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }
  };

  return withAdminAuth(handler)(context);
}
