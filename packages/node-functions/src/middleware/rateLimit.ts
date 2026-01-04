import type { Context, Next } from 'koa';
import { checkRateLimit, ErrorCodes } from '@webhook-pusher/shared';
import { authService } from '../services/auth.js';

const RATE_LIMIT = 60; // 60 requests per minute

/**
 * Rate limiting middleware
 * Enforces 60 requests per minute per SendKey
 */
export async function rateLimitMiddleware(ctx: Context, next: Next): Promise<void> {
  const user = ctx.state.user;

  if (!user) {
    // If no user in context, skip rate limiting (auth middleware should handle this)
    await next();
    return;
  }

  const result = checkRateLimit(user.rateLimit, RATE_LIMIT);

  // Set rate limit headers
  ctx.set('X-RateLimit-Limit', String(RATE_LIMIT));
  ctx.set('X-RateLimit-Remaining', String(result.remaining));
  ctx.set('X-RateLimit-Reset', result.resetAt);

  if (!result.allowed) {
    ctx.status = 429;
    ctx.body = {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded. Please try again later.',
      data: {
        limit: RATE_LIMIT,
        remaining: 0,
        resetAt: result.resetAt,
      },
    };
    return;
  }

  // Update rate limit counter
  const newRateLimit = {
    count: RATE_LIMIT - result.remaining,
    resetAt: result.resetAt,
  };
  await authService.updateRateLimit(user.id, newRateLimit);

  await next();
}
