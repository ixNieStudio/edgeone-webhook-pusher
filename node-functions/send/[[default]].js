/**
 * EdgeOne Node Functions - Webhook Handler (Koa)
 * Route: /send/* and /*.send
 * Feature: multi-tenant-refactor
 *
 * Handles webhook-style push requests:
 * - /:sendKey.send?title=xxx&desp=xxx
 * - /send/:sendKey?title=xxx&desp=xxx
 *
 * @see https://github.com/TencentEdgeOne/koa-template
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { ErrorCodes, ErrorMessages, errorResponse, getHttpStatus } from '../shared/error-codes.js';
import { sanitizeInput } from '../shared/utils.js';
import { pushService } from '../services/push.js';

// Create Koa application
const app = new Koa();
const router = new Router();

// Response time middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

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
    console.error('Webhook error:', err);
    ctx.status = err.status || 500;
    ctx.body = errorResponse(err.code || ErrorCodes.INTERNAL_ERROR, err.message);
  }
});

/**
 * Handle push request
 */
async function handlePush(ctx, sendKey) {
  // Merge GET params and POST body
  const query = ctx.query;
  const body = ctx.request.body || {};

  const title = query.title || body.title;
  const desp = query.desp || body.desp || body.content;

  // Validate required fields
  if (!title) {
    ctx.status = 400;
    ctx.body = errorResponse(ErrorCodes.MISSING_TITLE);
    return;
  }

  // Sanitize inputs
  const sanitizedTitle = sanitizeInput(title);
  const sanitizedDesp = desp ? sanitizeInput(desp) : undefined;

  // Execute push
  const result = await pushService.pushBySendKey(sendKey, sanitizedTitle, sanitizedDesp);

  if (!result.success) {
    ctx.status = getHttpStatus(result.error);
    ctx.body = errorResponse(result.error);
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      pushId: result.pushId,
      results: [
        {
          success: result.success,
          msgId: result.msgId,
        },
      ],
    },
  };
}

// Route: /send/:sendKey
router.all('/:sendKey', async (ctx) => {
  const { sendKey } = ctx.params;
  await handlePush(ctx, sendKey);
});

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export handler
export default app;
