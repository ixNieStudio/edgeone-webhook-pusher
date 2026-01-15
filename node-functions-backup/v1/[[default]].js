/**
 * EdgeOne Node Functions - API Handler (Koa)
 * Route: /v1/*
 * Feature: system-restructure
 *
 * @see https://github.com/TencentEdgeOne/koa-template
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';

// Import route handlers
import { onRequest as initHandler } from '../routes/init.js';
import { onRequest as configHandler } from '../routes/config.js';
import { onRequest as channelsHandler } from '../routes/channels.js';
import { onRequest as appsHandler } from '../routes/apps.js';
import { onRequest as openidsHandler } from '../routes/openids.js';
import { onRequest as messagesHandler } from '../routes/messages.js';
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
  // Create a Headers-like object with get method
  const headers = {
    ...ctx.headers,
    get: (name) => ctx.headers[name.toLowerCase()],
  };
  
  return {
    request: {
      method: ctx.method,
      url: ctx.href,
      headers,
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

// Channel routes (auth required - handled by route)
router.get('/channels', wrapHandler(channelsHandler));
router.post('/channels', wrapHandler(channelsHandler));
router.get('/channels/:id', wrapHandler(channelsHandler));
router.put('/channels/:id', wrapHandler(channelsHandler));
router.delete('/channels/:id', wrapHandler(channelsHandler));

// App routes (auth required - handled by route)
router.get('/apps', wrapHandler(appsHandler));
router.post('/apps', wrapHandler(appsHandler));
router.get('/apps/:id', wrapHandler(appsHandler));
router.put('/apps/:id', wrapHandler(appsHandler));
router.delete('/apps/:id', wrapHandler(appsHandler));

// OpenID routes (nested under apps - auth required)
router.get('/apps/:appId/openids', wrapHandler(openidsHandler));
router.post('/apps/:appId/openids', wrapHandler(openidsHandler));
router.get('/apps/:appId/openids/:id', wrapHandler(openidsHandler));
router.put('/apps/:appId/openids/:id', wrapHandler(openidsHandler));
router.delete('/apps/:appId/openids/:id', wrapHandler(openidsHandler));

// Message routes (auth required - handled by route)
router.get('/messages', wrapHandler(messagesHandler));
router.get('/messages/:id', wrapHandler(messagesHandler));

// Register WeChat message routes (no auth - public callback)
registerWeChatMsgRoutes(router);

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export handler
export default app;
