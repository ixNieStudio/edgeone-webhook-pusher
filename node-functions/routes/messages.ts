/**
 * Message History API Routes
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { messageService } from '../services/message.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { ApiError } from '../types/index.js';

const router = new Router({ prefix: '/messages' });

router.use(adminAuth);

function getBaseUrl(ctx: AppContext): string {
  return String(ctx.state.kvBaseUrl || `${ctx.protocol}://${ctx.host}`);
}

router.get('/', async (ctx: AppContext) => {
  const { page, pageSize, appId, direction, startDate, endDate } = ctx.query;

  const pageNum = parseInt(page as string || '1', 10);
  const pageSizeNum = parseInt(pageSize as string || '30', 10);

  if (pageNum < 1) {
    throw ApiError.badRequest('page must be >= 1');
  }
  if (pageSizeNum < 1 || pageSizeNum > 100) {
    throw ApiError.badRequest('pageSize must be between 1 and 100');
  }

  if (direction && !['inbound', 'outbound'].includes(direction as string)) {
    throw ApiError.badRequest('direction must be inbound or outbound');
  }

  ctx.body = await messageService.listSummaries({
    page: pageNum,
    pageSize: pageSizeNum,
    appId: appId as string | undefined,
    direction: direction as 'inbound' | 'outbound' | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  }, getBaseUrl(ctx));
});

router.get('/:id', async (ctx: AppContext) => {
  const message = await messageService.getDetail(ctx.params.id, getBaseUrl(ctx));
  if (!message) {
    throw ApiError.notFound('Message not found');
  }

  ctx.body = message;
});

export default router;
