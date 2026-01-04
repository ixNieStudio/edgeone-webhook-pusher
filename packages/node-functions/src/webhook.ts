/**
 * EdgeOne Node Functions - Webhook Handler (Koa)
 * Route: /send/*
 * 
 * This handles webhook push requests: /send/{sendKey}
 * Supports GET params, POST JSON, POST form
 * 
 * Example: GET /send/SCT123456?title=Hello&desp=World
 * 
 * EdgeOne Node Functions support Koa - just export the app instance.
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { ErrorCodes, sanitizeInput } from '@webhook-pusher/shared';
import { authService } from './services/auth.js';
import { pushService } from './services/push.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';

// Create Koa application
const app = new Koa();
const router = new Router();

// Body parser
app.use(bodyParser());

// CORS middleware
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type');

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }

  await next();
});

// Error handling
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const error = err as Error;
    console.error('Webhook error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 50001,
      message: 'Internal server error',
    };
  }
});

/**
 * Webhook push endpoint: /:sendKey
 * Since this file is at /send/[[default]].js, the route /:sendKey
 * will match /send/{sendKey}
 */
router.all('/:sendKey', async (ctx, next) => {
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

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export Koa app instance for EdgeOne Node Functions
export default app;
