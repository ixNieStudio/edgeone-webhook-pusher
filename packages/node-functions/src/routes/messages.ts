import Router from '@koa/router';
import { ErrorCodes } from '@webhook-pusher/shared';
import { historyService } from '../services/history.js';

const router = new Router();

/**
 * GET /api/messages - List message history
 */
router.get('/', async (ctx) => {
  const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : undefined;
  const cursor = ctx.query.cursor as string | undefined;

  const result = await historyService.getHistory({
    userId: ctx.state.userId,
    limit,
    cursor,
  });

  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      messages: result.messages,
      hasMore: result.hasMore,
      cursor: result.cursor,
    },
  };
});

/**
 * GET /api/messages/:id - Get message detail
 */
router.get('/:id', async (ctx) => {
  const message = await historyService.getMessage(ctx.params.id);

  if (!message) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.MESSAGE_NOT_FOUND,
      message: 'Message not found',
    };
    return;
  }

  // Verify ownership
  if (message.userId !== ctx.state.userId) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.MESSAGE_NOT_FOUND,
      message: 'Message not found',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: message,
  };
});

export { router as messagesRouter };
