/**
 * EdgeOne Node Functions - Topic Webhook Handler (Koa)
 * Route: /topic/* and /*.topic
 * Feature: multi-tenant-refactor
 *
 * Handles webhook-style topic push requests:
 * - /:topicKey.topic?title=xxx&desp=xxx
 * - /topic/:topicKey?title=xxx&desp=xxx
 *
 * @see https://github.com/TencentEdgeOne/koa-template
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { ErrorCodes, errorResponse, getHttpStatus } from '../shared/error-codes.js';
import { sanitizeInput } from '../shared/utils.js';
import { pushService } from '../modules/push/service.js';

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
    console.error('Topic webhook error:', err);
    ctx.status = err.status || 500;
    ctx.body = errorResponse(err.code || ErrorCodes.INTERNAL_ERROR, err.message);
  }
});

/**
 * Handle topic push request
 */
async function handleTopicPush(ctx, topicKey) {
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
  const result = await pushService.pushByTopicKey(topicKey, sanitizedTitle, sanitizedDesp);

  if (result.error) {
    ctx.status = getHttpStatus(result.error);
    ctx.body = errorResponse(result.error);
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      pushId: result.pushId,
      total: result.total,
      success: result.success,
      failed: result.failed,
      results: result.results,
    },
  };
}

// Route: /topic/:topicKey
router.all('/:topicKey', async (ctx) => {
  const { topicKey } = ctx.params;
  await handleTopicPush(ctx, topicKey);
});

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export handler
export default app;
