/**
 * Admin Token Authentication Middleware
 * Feature: multi-tenant-refactor
 *
 * Validates Admin Token for management API requests.
 * Send APIs do not require authentication.
 */

import { authService } from '../services/auth.js';
import { ErrorCodes, errorResponse as createErrorBody, getHttpStatus } from '../shared/error-codes.js';

/**
 * Create JSON error response with unified format
 * @param {number} code - Error code
 * @param {string} [message] - Error message
 * @returns {Response}
 */
function errorResponse(code, message) {
  return new Response(
    JSON.stringify(createErrorBody(code, message)),
    {
      status: getHttpStatus(code),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

/**
 * Extract Admin Token from request
 * Supports: Authorization: Bearer <token> or X-Admin-Token header
 * @param {Request} request
 * @returns {string|null}
 */
function extractToken(request) {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }

  // Try X-Admin-Token header
  const tokenHeader = request.headers.get('X-Admin-Token');
  if (tokenHeader) {
    return tokenHeader;
  }

  return null;
}

/**
 * Admin authentication middleware
 * Validates Admin Token and adds auth info to context
 * @param {Object} context - Request context
 * @returns {Promise<Response|null>} - Returns error response if auth fails, null if success
 */
export async function adminAuthMiddleware(context) {
  const { request } = context;

  // Skip auth for OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return null;
  }

  // Extract token
  const token = extractToken(request);

  if (!token) {
    return errorResponse(ErrorCodes.TOKEN_REQUIRED);
  }

  // Validate token
  const isValid = await authService.validateAdminToken(token);

  if (!isValid) {
    return errorResponse(ErrorCodes.INVALID_TOKEN);
  }

  // Auth successful, continue to handler
  return null;
}

/**
 * Wrap a handler with admin authentication
 * @param {Function} handler - Route handler function
 * @returns {Function} - Wrapped handler with auth
 */
export function withAdminAuth(handler) {
  return async (context) => {
    const authError = await adminAuthMiddleware(context);
    if (authError) {
      return authError;
    }
    return handler(context);
  };
}

/**
 * Check if request has valid admin token (non-blocking)
 * @param {Request} request
 * @returns {Promise<boolean>}
 */
export async function hasValidAdminToken(request) {
  const token = extractToken(request);
  if (!token) return false;
  return authService.validateAdminToken(token);
}
