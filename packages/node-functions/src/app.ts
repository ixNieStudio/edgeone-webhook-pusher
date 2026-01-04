import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { pushRouter } from './routes/push.js';
import { channelsRouter } from './routes/channels.js';
import { messagesRouter } from './routes/messages.js';
import { userRouter } from './routes/user.js';
import { authMiddleware } from './middleware/auth.js';

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

// Public routes (webhook push)
router.use(pushRouter.routes());

// Protected routes (require auth)
router.use('/api/channels', authMiddleware, channelsRouter.routes());
router.use('/api/messages', authMiddleware, messagesRouter.routes());
router.use('/api/user', authMiddleware, userRouter.routes());

// Health check
router.get('/api/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

app.use(router.routes());
app.use(router.allowedMethods());

// Export for EdgeOne Node Functions
export default app.callback();

// Also export app for testing
export { app };
