import Router from '@koa/router';
import { ErrorCodes, sanitizeInput } from '@webhook-pusher/shared';
import { authService } from '../services/auth.js';
import { pushService } from '../services/push.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';

const router = new Router();

/**
 * Webhook push endpoint: /{sendKey}.send
 * Supports GET params, POST JSON, POST form
 */
router.all('/:sendKey.send', async (ctx, next) => {
  const { sendKey } = ctx.params;

  // Validate SendKey
  const user = await authService.validateSendKey(sendKey);
  if (!user) {
    ctx.status = 401;
    ctx.body = {
      code: ErrorCodes.INVALID_SENDKEY,
      message: 'Invalid SendKey',
    };
    return;
  }

  // Attach user to context for rate limiting
  ctx.state.user = user;
  ctx.state.userId = user.id;

  await next();
}, rateLimitMiddleware, async (ctx) => {
  // Merge GET params and POST body
  const query = ctx.query as Record<string, string | string[] | undefined>;
  const body = (ctx.request.body || {}) as Record<string, unknown>;

  const title = (query.title || body.title) as string | undefined;
  const desp = (query.desp || body.desp) as string | undefined;
  const channel = (query.channel || body.channel) as string | undefined;

  // Validate required fields
  if (!title) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.MISSING_TITLE,
      message: 'Missing required parameter: title',
    };
    return;
  }

  // Sanitize inputs
  const sanitizedTitle = sanitizeInput(title);
  const sanitizedDesp = desp ? sanitizeInput(desp) : undefined;

  // Execute push
  const result = await pushService.push(ctx.state.userId, {
    title: sanitizedTitle,
    desp: sanitizedDesp,
    channel,
  });

  ctx.body = {
    code: 0,
    message: 'success',
    data: { pushId: result.pushId },
  };
});

export { router as pushRouter };
