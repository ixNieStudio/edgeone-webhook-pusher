import type { Context, Next } from 'koa';
import { authService } from '../services/auth.js';
import { ErrorCodes } from '@webhook-pusher/shared';

/**
 * Authentication middleware
 * Validates Authorization header and attaches user to context
 */
export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  const authHeader = ctx.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = {
      code: ErrorCodes.INVALID_SENDKEY,
      message: 'Missing or invalid Authorization header',
    };
    return;
  }

  const sendKey = authHeader.slice(7); // Remove 'Bearer ' prefix
  const user = await authService.validateSendKey(sendKey);

  if (!user) {
    ctx.status = 401;
    ctx.body = {
      code: ErrorCodes.INVALID_SENDKEY,
      message: 'Invalid SendKey',
    };
    return;
  }

  // Attach user to context state
  ctx.state.user = user;
  ctx.state.userId = user.id;

  await next();
}
