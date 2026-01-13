/**
 * SendKey Management API Routes
 * Feature: multi-tenant-refactor
 *
 * GET /api/sendkeys - List all SendKeys
 * POST /api/sendkeys - Create SendKey
 * GET /api/sendkeys/:id - Get single SendKey
 * PUT /api/sendkeys/:id - Update SendKey
 * DELETE /api/sendkeys/:id - Delete SendKey
 *
 * All routes require Admin Token authentication
 */

import { sendkeyService } from '../services/sendkey.js';
import { openidService } from '../services/openid.js';
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
  const match = pathname.match(/\/api\/sendkeys\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/sendkeys - List all SendKeys
 */
async function handleList(context) {
  try {
    const sendkeys = await sendkeyService.list();
    // Mask keys in response
    const maskedSendkeys = sendkeys.map((sk) => sendkeyService.maskSendKey(sk));
    return jsonResponse(200, {
      success: true,
      data: maskedSendkeys,
    });
  } catch (error) {
    console.error('List sendkeys error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/sendkeys - Create SendKey
 */
async function handleCreate(context) {
  const { request } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const { name, openIdRef } = body;

    if (!name) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'name is required');
    }

    if (!openIdRef) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'openIdRef is required');
    }

    // Verify OpenID exists
    const openid = await openidService.get(openIdRef);
    if (!openid) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Referenced OpenID does not exist');
    }

    const data = await sendkeyService.create(name, openIdRef);

    // Return full key on creation (only time it's shown)
    return jsonResponse(201, {
      success: true,
      data,
      message: 'SendKey created. Please save the key value securely - it will be masked in future responses.',
    });
  } catch (error) {
    console.error('Create sendkey error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/sendkeys/:id - Get single SendKey
 */
async function handleGet(context, id) {
  try {
    const data = await sendkeyService.get(id);
    if (!data) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'SendKey not found');
    }

    // Mask key in response
    const maskedData = sendkeyService.maskSendKey(data);
    return jsonResponse(200, {
      success: true,
      data: maskedData,
    });
  } catch (error) {
    console.error('Get sendkey error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * PUT /api/sendkeys/:id - Update SendKey
 */
async function handleUpdate(context, id) {
  const { request } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const { name, openIdRef } = body;

    // If updating openIdRef, verify it exists
    if (openIdRef) {
      const openid = await openidService.get(openIdRef);
      if (!openid) {
        return errorResponse(ErrorCodes.INVALID_PARAM, 'Referenced OpenID does not exist');
      }
    }

    const data = await sendkeyService.update(id, { name, openIdRef });

    if (!data) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'SendKey not found');
    }

    // Mask key in response
    const maskedData = sendkeyService.maskSendKey(data);
    return jsonResponse(200, {
      success: true,
      data: maskedData,
    });
  } catch (error) {
    console.error('Update sendkey error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * DELETE /api/sendkeys/:id - Delete SendKey
 */
async function handleDelete(context, id) {
  try {
    const deleted = await sendkeyService.delete(id);
    if (!deleted) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'SendKey not found');
    }

    return jsonResponse(200, {
      success: true,
      message: 'SendKey deleted',
    });
  } catch (error) {
    console.error('Delete sendkey error:', error);
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

  // All sendkey routes require admin auth
  const handler = async (ctx) => {
    const id = extractId(pathname);

    // Collection routes: /api/sendkeys
    if (!id) {
      switch (request.method) {
        case 'GET':
          return handleList(ctx);
        case 'POST':
          return handleCreate(ctx);
        default:
          return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
      }
    }

    // Item routes: /api/sendkeys/:id
    switch (request.method) {
      case 'GET':
        return handleGet(ctx, id);
      case 'PUT':
        return handleUpdate(ctx, id);
      case 'DELETE':
        return handleDelete(ctx, id);
      default:
        return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }
  };

  return withAdminAuth(handler)(context);
}
