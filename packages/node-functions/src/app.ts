/**
 * EdgeOne Node Functions - API Handler (Koa)
 * Route: /api/*
 * 
 * This handles all /api/* routes using Koa framework.
 * EdgeOne Node Functions support Koa - just export the app instance.
 * No need to start HTTP server - EdgeOne handles that.
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { channelsRouter } from './routes/channels.js';
import { messagesRouter } from './routes/messages.js';
import { userRouter } from './routes/user.js';
import { authMiddleware } from './middleware/auth.js';

// Create Koa application
const app = new Koa();
const router = new Router();

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
    const error = err as Error;
    console.error('Server error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 50001,
      message: 'Internal server error',
    };
  }
});

// Health check (relative to /api/)
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// Protected routes (require auth)
// Note: Routes are relative to /api/ since this file handles /api/*
router.use('/channels', authMiddleware, channelsRouter.routes());
router.use('/messages', authMiddleware, messagesRouter.routes());
router.use('/user', authMiddleware, userRouter.routes());

// Use router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Export Koa app instance for EdgeOne Node Functions
// EdgeOne will handle HTTP server - just export the app
export default app;
