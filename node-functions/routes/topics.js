/**
 * Topic Management API Routes
 * Feature: multi-tenant-refactor
 *
 * GET /api/topics - List all Topics
 * POST /api/topics - Create Topic
 * GET /api/topics/:id - Get single Topic
 * PUT /api/topics/:id - Update Topic
 * DELETE /api/topics/:id - Delete Topic
 * POST /api/topics/:id/subscribe - Add subscriber
 * DELETE /api/topics/:id/subscribe/:openIdRef - Remove subscriber
 * GET /api/topics/:id/subscribers - Get subscribers
 *
 * All routes require Admin Token authentication
 */

import { topicService } from '../services/topic.js';
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
 * Parse topic route
 * @param {string} pathname
 * @returns {{ id: string|null, action: string|null, subId: string|null }}
 */
function parseRoute(pathname) {
  // /api/topics/:id/subscribe/:openIdRef
  const subMatch = pathname.match(/\/api\/topics\/([^/]+)\/subscribe\/([^/]+)/);
  if (subMatch) {
    return { id: subMatch[1], action: 'unsubscribe', subId: subMatch[2] };
  }

  // /api/topics/:id/subscribe
  const subscribeMatch = pathname.match(/\/api\/topics\/([^/]+)\/subscribe$/);
  if (subscribeMatch) {
    return { id: subscribeMatch[1], action: 'subscribe', subId: null };
  }

  // /api/topics/:id/subscribers
  const subscribersMatch = pathname.match(/\/api\/topics\/([^/]+)\/subscribers$/);
  if (subscribersMatch) {
    return { id: subscribersMatch[1], action: 'subscribers', subId: null };
  }

  // /api/topics/:id
  const idMatch = pathname.match(/\/api\/topics\/([^/]+)/);
  if (idMatch) {
    return { id: idMatch[1], action: null, subId: null };
  }

  // /api/topics
  return { id: null, action: null, subId: null };
}

/**
 * GET /api/topics - List all Topics
 */
async function handleList(context) {
  try {
    const topics = await topicService.list();
    // Mask keys in response
    const maskedTopics = topics.map((t) => topicService.maskTopicKey(t));
    return jsonResponse(200, {
      success: true,
      data: maskedTopics,
    });
  } catch (error) {
    console.error('List topics error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/topics - Create Topic
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

    const { name } = body;

    if (!name) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'name is required');
    }

    const data = await topicService.create(name);

    // Return full key on creation (only time it's shown)
    return jsonResponse(201, {
      success: true,
      data,
      message: 'Topic created. Please save the key value securely - it will be masked in future responses.',
    });
  } catch (error) {
    console.error('Create topic error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/topics/:id - Get single Topic
 */
async function handleGet(context, id) {
  try {
    const data = await topicService.get(id);
    if (!data) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'Topic not found');
    }

    // Mask key in response
    const maskedData = topicService.maskTopicKey(data);
    return jsonResponse(200, {
      success: true,
      data: maskedData,
    });
  } catch (error) {
    console.error('Get topic error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * PUT /api/topics/:id - Update Topic
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
    const data = await topicService.update(id, { name });

    if (!data) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'Topic not found');
    }

    // Mask key in response
    const maskedData = topicService.maskTopicKey(data);
    return jsonResponse(200, {
      success: true,
      data: maskedData,
    });
  } catch (error) {
    console.error('Update topic error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * DELETE /api/topics/:id - Delete Topic
 */
async function handleDelete(context, id) {
  try {
    const deleted = await topicService.delete(id);
    if (!deleted) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'Topic not found');
    }

    return jsonResponse(200, {
      success: true,
      message: 'Topic deleted',
    });
  } catch (error) {
    console.error('Delete topic error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * POST /api/topics/:id/subscribe - Add subscriber
 */
async function handleSubscribe(context, id) {
  const { request } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Invalid JSON body');
    }

    const { openIdRef } = body;

    if (!openIdRef) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'openIdRef is required');
    }

    // Verify topic exists
    const topic = await topicService.get(id);
    if (!topic) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'Topic not found');
    }

    // Verify OpenID exists
    const openid = await openidService.get(openIdRef);
    if (!openid) {
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Referenced OpenID does not exist');
    }

    await topicService.subscribe(id, openIdRef);

    return jsonResponse(200, {
      success: true,
      message: 'Subscriber added',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * DELETE /api/topics/:id/subscribe/:openIdRef - Remove subscriber
 */
async function handleUnsubscribe(context, id, openIdRef) {
  try {
    // Verify topic exists
    const topic = await topicService.get(id);
    if (!topic) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'Topic not found');
    }

    await topicService.unsubscribe(id, openIdRef);

    return jsonResponse(200, {
      success: true,
      message: 'Subscriber removed',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
}

/**
 * GET /api/topics/:id/subscribers - Get subscribers
 */
async function handleGetSubscribers(context, id) {
  try {
    // Verify topic exists
    const topic = await topicService.get(id);
    if (!topic) {
      return errorResponse(ErrorCodes.KEY_NOT_FOUND, 'Topic not found');
    }

    const subscribers = await topicService.getSubscribers(id);

    return jsonResponse(200, {
      success: true,
      data: subscribers,
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
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

  // All topic routes require admin auth
  const handler = async (ctx) => {
    const { id, action, subId } = parseRoute(pathname);

    // Collection routes: /api/topics
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

    // Subscription routes
    if (action === 'subscribe') {
      if (request.method === 'POST') {
        return handleSubscribe(ctx, id);
      }
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }

    if (action === 'unsubscribe') {
      if (request.method === 'DELETE') {
        return handleUnsubscribe(ctx, id, subId);
      }
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }

    if (action === 'subscribers') {
      if (request.method === 'GET') {
        return handleGetSubscribers(ctx, id);
      }
      return errorResponse(ErrorCodes.INVALID_PARAM, 'Method not allowed');
    }

    // Item routes: /api/topics/:id
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
