/**
 * Webhook-style Topic Push Route
 * Feature: multi-tenant-refactor
 *
 * URL: /:topicKey.topic
 * Method: GET only
 * Query params: title (required), desp (optional)
 *
 * No authentication required - only validates TopicKey existence
 */

import { pushService } from '../modules/push/service.js';
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
 * Extract TopicKey from URL path
 * Supports: /TPKxxx.topic or /topic/TPKxxx
 * @param {string} pathname
 * @returns {string|null}
 */
function extractTopicKey(pathname) {
  // Pattern: /:topicKey.topic
  const dotMatch = pathname.match(/\/([^/]+)\.topic$/);
  if (dotMatch) {
    return dotMatch[1];
  }

  // Pattern: /topic/:topicKey
  const slashMatch = pathname.match(/\/topic\/([^/]+)/);
  if (slashMatch) {
    return slashMatch[1];
  }

  return null;
}

/**
 * Map error code to HTTP status
 */
function getHttpStatus(errorCode) {
  switch (errorCode) {
    case ErrorCodes.KEY_NOT_FOUND:
      return 404;
    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return 429;
    case ErrorCodes.NO_SUBSCRIBERS:
      return 400;
    case ErrorCodes.MISSING_TITLE:
    case ErrorCodes.INVALID_PARAM:
      return 400;
    case ErrorCodes.INVALID_CONFIG:
      return 500;
    default:
      return 500;
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
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse(405, ErrorCodes.INVALID_PARAM, 'Method not allowed. Use GET with query params.');
  }

  // Extract TopicKey from URL
  const topicKey = extractTopicKey(pathname);
  if (!topicKey) {
    return errorResponse(400, ErrorCodes.INVALID_PARAM, 'Invalid URL format');
  }

  // Get parameters from query string
  const title = url.searchParams.get('title');
  const desp = url.searchParams.get('desp');

  // Validate title
  if (!title) {
    return errorResponse(400, ErrorCodes.MISSING_TITLE);
  }

  // Push message
  try {
    const result = await pushService.pushByTopicKey(topicKey, title, desp);

    if (result.error) {
      return errorResponse(getHttpStatus(result.error), result.error);
    }

    return successResponse({
      pushId: result.pushId,
      total: result.total,
      success: result.success,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error('Topic push error:', error);
    return errorResponse(500, ErrorCodes.INTERNAL_ERROR, error.message);
  }
}
