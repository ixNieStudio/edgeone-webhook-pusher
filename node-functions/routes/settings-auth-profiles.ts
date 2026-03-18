/**
 * Auth profile routes exposed under settings.
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { authProfileService } from '../services/auth-profile.service.js';
import { ApiError } from '../types/api.js';

const router = new Router({ prefix: '/settings/auth-profiles' });

router.use(adminAuth);

function getBaseUrl(ctx: AppContext): string {
  return `${ctx.protocol}://${ctx.host}`;
}

router.get('/', async (ctx: AppContext) => {
  ctx.body = await authProfileService.list();
});

router.get('/:id', async (ctx: AppContext) => {
  ctx.body = await authProfileService.getDetail(ctx.params.id, getBaseUrl(ctx));
});

router.post('/:id/verify', async (ctx: AppContext) => {
  ctx.body = await authProfileService.verify(ctx.params.id);
});

router.post('/', async (ctx: AppContext) => {
  const body = ctx.request.body as {
    name?: string;
    type?: 'wechat' | 'work_wechat';
    config?: Record<string, unknown>;
  } | undefined;

  if (!body?.name || !body.type || !body.config) {
    throw ApiError.badRequest('name, type and config are required');
  }

  ctx.status = 201;
  ctx.body = await authProfileService.create({
    name: body.name,
    type: body.type,
    config: body.config,
  });
});

router.put('/:id', async (ctx: AppContext) => {
  const body = ctx.request.body as {
    name?: string;
    config?: Record<string, unknown>;
  } | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  ctx.body = await authProfileService.update(ctx.params.id, body);
});

export default router;
