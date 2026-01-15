/**
 * EdgeOne Node Functions - Webhook Handler (Koa)
 * Route: /send/* and /*.send
 * Feature: system-restructure
 *
 * Handles webhook-style push requests:
 * - /{appKey}.send?title=xxx&desp=xxx (GET)
 * - /{appKey}.send with JSON body (POST)
 * - /send/{appKey}?title=xxx&desp=xxx (GET)
 * - /send/{appKey} with JSON body (POST)
 *
 * @see https://github.com/TencentEdgeOne/koa-template
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { ErrorCodes, ErrorMessages, errorResponse, getHttpStatus } from '../shared/error-codes.js';
import { sanitizeInput } from '../shared/utils.js';
import { pushService } from '../modules/push/service.js';
import { setKVBaseUrl } from '../shared/kv-client.js';

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

// Set KV base URL from request context
app.use(async (ctx, next) => {
  const origin = `${ctx.protocol}://${ctx.host}`;
  setKVBaseUrl(origin);
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
 * Map error message to HTTP status
 */
function mapErrorToStatus(errorMsg) {
  if (errorMsg === 'App not found') return 404;
  if (errorMsg === 'No OpenIDs bound to this app') return 400;
  if (errorMsg === 'Channel not found') return 500;
  if (errorMsg === 'Failed to get access token') return 500;
  return 500;
}

/**
 * Handle push request
 */
async function handlePush(ctx, appKey) {
  // Merge GET params and POST body
  const query = ctx.query;
  const body = ctx.request.body || {};

  const title = query.title || body.title;
  const desp = query.desp || body.desp || body.content;
  const data = body.data; // 模板消息数据

  // Validate required fields
  if (!title) {
    ctx.status = 400;
    ctx.body = errorResponse(ErrorCodes.MISSING_TITLE, 'Missing required field: title');
    return;
  }

  // Sanitize inputs
  const message = {
    title: sanitizeInput(title),
    desp: desp ? sanitizeInput(desp) : undefined,
    data,
  };

  // Execute push
  const result = await pushService.push(appKey, message);

  if (result.error) {
    ctx.status = mapErrorToStatus(result.error);
    ctx.body = errorResponse(ErrorCodes.INTERNAL_ERROR, result.error);
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

// Route: /send/:appKey
router.all('/:appKey', async (ctx) => {
  const { appKey } = ctx.params;
  await handlePush(ctx, appKey);
});

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export handler
export default app;
