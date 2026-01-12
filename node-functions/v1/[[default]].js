/**
 * EdgeOne Node Functions - API Handler (Koa)
 * Route: /v1/*
 *
 * @see https://github.com/TencentEdgeOne/koa-template
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { channelsRouter } from '../routes/channels.js';
import { messagesRouter } from '../routes/messages.js';
import { userRouter } from '../routes/user.js';
import { authMiddleware } from '../middleware/auth.js';

// Create Koa application
const app = new Koa();
const router = new Router();

// Add some middleware
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
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    ctx.body = {
      code: err.code || 50001,
      message: err.message || 'Internal server error',
    };
  }
});

// Define routes
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// Protected routes
router.use('/channels', authMiddleware, channelsRouter.routes());
router.use('/messages', authMiddleware, messagesRouter.routes());
router.use('/user', authMiddleware, userRouter.routes());

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export handler
export default app;
