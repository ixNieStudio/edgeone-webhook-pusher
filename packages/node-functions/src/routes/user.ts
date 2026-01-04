import Router from '@koa/router';
import { authService } from '../services/auth.js';

const router = new Router();

/**
 * GET /api/user/sendkey - Get current SendKey
 */
router.get('/sendkey', async (ctx) => {
  const user = ctx.state.user;

  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      sendKey: user.sendKey,
      createdAt: user.createdAt,
    },
  };
});

/**
 * POST /api/user/sendkey - Regenerate SendKey
 */
router.post('/sendkey', async (ctx) => {
  const newSendKey = await authService.regenerateSendKey(ctx.state.userId);

  if (!newSendKey) {
    ctx.status = 500;
    ctx.body = {
      code: 50001,
      message: 'Failed to regenerate SendKey',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      sendKey: newSendKey,
    },
  };
});

/**
 * GET /api/user/profile - Get user profile
 */
router.get('/profile', async (ctx) => {
  const user = ctx.state.user;

  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      id: user.id,
      createdAt: user.createdAt,
      rateLimit: {
        limit: 60,
        remaining: 60 - user.rateLimit.count,
        resetAt: user.rateLimit.resetAt,
      },
    },
  };
});

export { router as userRouter };
