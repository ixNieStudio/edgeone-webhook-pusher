/**
 * EdgeOne Node Functions - API Handler (Koa)
 * Route: /v1/*
 * Feature: multi-tenant-refactor
 *
 * @see https://github.com/TencentEdgeOne/koa-template
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';

// Import route handlers
import { onRequest as initHandler } from '../routes/init.js';
import { onRequest as configHandler } from '../routes/config.js';
import { onRequest as openidsHandler } from '../routes/openids.js';
import { onRequest as sendkeysHandler } from '../routes/sendkeys.js';
import { onRequest as topicsHandler } from '../routes/topics.js';
import { onRequest as messagesHandler } from '../routes/messages.js';
import { registerStatsRoutes } from '../routes/stats.js';
import { registerBindRoutes } from '../routes/bind.js';
import { registerSubscribeRoutes } from '../routes/subscribe.js';
import { registerWeChatMsgRoutes } from '../routes/wechat-msg.js';
import { ErrorCodes, errorResponse } from '../shared/error-codes.js';

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
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

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
    console.error('Server error:', err);
    ctx.status = err.status || 500;
    ctx.body = errorResponse(err.code || ErrorCodes.INTERNAL_ERROR, err.message);
  }
});

/**
 * Convert Koa context to EdgeOne-style context for route handlers
 */
function createEdgeContext(ctx) {
  return {
    request: {
      method: ctx.method,
      url: ctx.href,
      headers: ctx.headers,
      json: async () => ctx.request.body,
      text: async () => JSON.stringify(ctx.request.body || {}),
    },
  };
}

/**
 * Wrap EdgeOne-style handler for Koa
 */
function wrapHandler(handler) {
  return async (ctx) => {
    const edgeContext = createEdgeContext(ctx);
    const response = await handler(edgeContext);
    
    ctx.status = response.status;
    const body = await response.json();
    ctx.body = body;
    
    // Copy headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-type') {
        ctx.set(key, value);
      }
    });
  };
}

// Health check
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// Init routes (no auth required)
router.get('/init/status', wrapHandler(initHandler));
router.post('/init', wrapHandler(initHandler));

// Config routes (auth required - handled by route)
router.get('/config', wrapHandler(configHandler));
router.put('/config', wrapHandler(configHandler));

// OpenID routes (auth required - handled by route)
router.get('/openids', wrapHandler(openidsHandler));
router.post('/openids', wrapHandler(openidsHandler));
router.get('/openids/:id', wrapHandler(openidsHandler));
router.put('/openids/:id', wrapHandler(openidsHandler));
router.delete('/openids/:id', wrapHandler(openidsHandler));

// SendKey routes (auth required - handled by route)
router.get('/sendkeys', wrapHandler(sendkeysHandler));
router.post('/sendkeys', wrapHandler(sendkeysHandler));
router.get('/sendkeys/:id', wrapHandler(sendkeysHandler));
router.put('/sendkeys/:id', wrapHandler(sendkeysHandler));
router.delete('/sendkeys/:id', wrapHandler(sendkeysHandler));

// Topic routes (auth required - handled by route)
router.get('/topics', wrapHandler(topicsHandler));
router.post('/topics', wrapHandler(topicsHandler));
router.get('/topics/:id', wrapHandler(topicsHandler));
router.put('/topics/:id', wrapHandler(topicsHandler));
router.delete('/topics/:id', wrapHandler(topicsHandler));
router.post('/topics/:id/subscribe', wrapHandler(topicsHandler));
router.delete('/topics/:id/subscribe/:openIdRef', wrapHandler(topicsHandler));
router.get('/topics/:id/subscribers', wrapHandler(topicsHandler));

// Message routes (auth required - handled by route)
router.get('/messages', wrapHandler(messagesHandler));
router.get('/messages/:id', wrapHandler(messagesHandler));

// Register stats routes
registerStatsRoutes(router);

// Register bind routes (no auth - public OAuth flow)
registerBindRoutes(router);

// Register subscribe routes (no auth - public OAuth flow)
registerSubscribeRoutes(router);

// Register WeChat message routes (no auth - public callback)
registerWeChatMsgRoutes(router);

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export handler
export default app;
