/**
 * Admin Token 认证中间件
 */

import type { Next } from 'koa';
import type { AppContext } from '../types/context.js';
import { ApiError, ErrorCodes } from '../types/index.js';
import { configService } from '../services/config.service.js';
import { isValidAdminToken } from '../shared/utils.js';

/**
 * 从请求中提取 Admin Token
 * 支持: Authorization: Bearer <token> 或 X-Admin-Token header
 */
function extractToken(ctx: AppContext): string | null {
  // Try Authorization header first
  const authHeader = ctx.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }

  // Try X-Admin-Token header
  const tokenHeader = ctx.get('X-Admin-Token');
  if (tokenHeader) {
    return tokenHeader;
  }

  return null;
}

/**
 * Admin Token 认证中间件
 * 验证 Admin Token 并将认证信息添加到 ctx.state
 */
export async function adminAuth(ctx: AppContext, next: Next): Promise<void> {
  // Skip auth for OPTIONS requests (CORS preflight)
  if (ctx.method === 'OPTIONS') {
    await next();
    return;
  }

  // Extract token
  const token = extractToken(ctx);

  if (!token) {
    throw new ApiError(ErrorCodes.TOKEN_REQUIRED, 'Admin token is required', 401);
  }

  // Validate token format
  if (!isValidAdminToken(token)) {
    throw new ApiError(ErrorCodes.INVALID_TOKEN, 'Invalid admin token format', 401);
  }

  // Validate token against stored config
  const config = await configService.getConfig();
  if (!config || !config.adminToken || config.adminToken !== token) {
    throw new ApiError(ErrorCodes.INVALID_TOKEN, 'Invalid admin token', 401);
  }

  // Auth successful, store token in state
  ctx.state.adminToken = token;

  await next();
}

/**
 * 检查请求是否有有效的 admin token（非阻塞）
 */
export async function hasValidAdminToken(ctx: AppContext): Promise<boolean> {
  const token = extractToken(ctx);
  if (!token || !isValidAdminToken(token)) {
    return false;
  }

  const config = await configService.getConfig();
  if (!config || !config.adminToken) {
    return false;
  }

  return config.adminToken === token;
}
