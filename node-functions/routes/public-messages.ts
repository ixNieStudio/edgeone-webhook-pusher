import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { messageDetailService } from '../services/message-detail.service.js';
import { ApiError } from '../types/api.js';

const router = new Router({ prefix: '/public/messages' });

router.get('/:token', async (ctx: AppContext) => {
  const detail = await messageDetailService.getPublicDetail(ctx.params.token);
  if (!detail) {
    throw ApiError.notFound('Message detail not found');
  }

  ctx.body = detail;
});

export default router;
