/**
 * OpenID Management API Routes
 * Feature: multi-tenant-refactor
 *
 * GET /api/openids - List all OpenIDs
 * POST /api/openids - Create OpenID
 * GET /api/openids/:id - Get single OpenID
 * PUT /api/openids/:id - Update OpenID
 * DELETE /api/openids/:id - Delete OpenID
 *
 * All routes require Admin Token authentication
 */

import { openidService } from '../services/openid.js';
import { sendkeyService } from '../services/sendkey.js';
import { topicService } from '../services/topic.js';
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
  const match = pathname.match(/\/api\/openids\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/openids - List all OpenIDs
 */
async function handleList(context) {
  try {
    const openids = await openidService.list();
    return jsonResponse(200, {
      success: true,
      data: openids,
    });
  } catch (error) {
    console.error('List openids error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/openids - Create OpenID
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

    const { openId, name } = body;

    if (!openId) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'openId is required');
    }

    const data = await openidService.create(openId, name);
    return jsonResponse(201, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.message === 'OpenID already exists') {
      return errorResponse(ErrorCodes.INVALID_PARAM, error.message);
    }
    console.error('Create openid error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/openids/:id - Get single OpenID
 */
async function handleGet(context, id) {
  try {
    const data = await openidService.get(id);
    if (!data) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'OpenID not found');
    }
    return jsonResponse(200, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get openid error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * PUT /api/openids/:id - Update OpenID
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

    const { name } = body;
    const data = await openidService.update(id, { name });

    if (!data) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'OpenID not found');
    }

    return jsonResponse(200, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Update openid error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * DELETE /api/openids/:id - Delete OpenID
 */
async function handleDelete(context, id) {
  try {
    // Check references
    const refs = await openidService.checkReferences(id, {
      sendkeyService,
      topicService,
    });

    if (refs.referenced) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 
        `Cannot delete: OpenID is referenced by ${refs.sendkeys.length} SendKey(s) and ${refs.topics.length} Topic(s)`
      );
    }

    const deleted = await openidService.delete(id);
    if (!deleted) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'OpenID not found');
    }

    return jsonResponse(200, {
      success: true,
      message: 'OpenID deleted',
    });
  } catch (error) {
    console.error('Delete openid error:', error);
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
    const id = extractId(pathname);

    // Collection routes: /api/openids
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

    // Item routes: /api/openids/:id
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
