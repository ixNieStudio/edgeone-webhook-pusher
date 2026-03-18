/**
 * App-first application routes.
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { appOrchestratorService } from '../services/app-orchestrator.service.js';
import { ApiError } from '../types/api.js';
import type { CreateManagedAppInput, UpdateManagedAppInput } from '../types/app-config.js';
import type { PushMessageInput } from '../types/message.js';

const router = new Router({ prefix: '/apps' });

router.use(adminAuth);

function getBaseUrl(ctx: AppContext): string {
  return `${ctx.protocol}://${ctx.host}`;
}

router.get('/', async (ctx: AppContext) => {
  ctx.body = await appOrchestratorService.list(getBaseUrl(ctx));
});

router.post('/', async (ctx: AppContext) => {
  const body = ctx.request.body as CreateManagedAppInput | undefined;
  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  ctx.status = 201;
  ctx.body = await appOrchestratorService.create(body);
});

router.get('/:id', async (ctx: AppContext) => {
  ctx.body = await appOrchestratorService.get(ctx.params.id, getBaseUrl(ctx));
});

router.put('/:id', async (ctx: AppContext) => {
  const body = ctx.request.body as UpdateManagedAppInput | undefined;
  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  ctx.body = await appOrchestratorService.update(ctx.params.id, body, getBaseUrl(ctx));
});

router.delete('/:id', async (ctx: AppContext) => {
  await appOrchestratorService.delete(ctx.params.id);
  ctx.status = 204;
});

router.get('/:id/config', async (ctx: AppContext) => {
  ctx.body = await appOrchestratorService.getConfig(ctx.params.id);
});

router.put('/:id/config', async (ctx: AppContext) => {
  const body = ctx.request.body as UpdateManagedAppInput | undefined;
  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  ctx.body = await appOrchestratorService.update(ctx.params.id, body, getBaseUrl(ctx));
});

router.get('/:id/recipients', async (ctx: AppContext) => {
  ctx.body = await appOrchestratorService.listRecipients(ctx.params.id);
});

router.post('/:id/recipients/bind', async (ctx: AppContext) => {
  ctx.status = 201;
  ctx.body = await appOrchestratorService.createBind(ctx.params.id);
});

router.get('/:id/recipients/bind/:code', async (ctx: AppContext) => {
  ctx.body = await appOrchestratorService.getBindStatus(ctx.params.id, ctx.params.code);
});

router.delete('/:id/recipients/:recipientId', async (ctx: AppContext) => {
  await appOrchestratorService.deleteRecipient(ctx.params.id, ctx.params.recipientId);
  ctx.status = 204;
});

router.post('/:id/test-send', async (ctx: AppContext) => {
  const body = ctx.request.body as PushMessageInput | undefined;
  if (!body?.title?.trim()) {
    throw ApiError.badRequest('title is required');
  }

  ctx.body = await appOrchestratorService.testSend(
    ctx.params.id,
    {
      title: body.title.trim(),
      desp: body.desp?.trim(),
      content: body.content?.trim(),
      type: body.type,
      format: body.format,
      url: body.url?.trim(),
      summary: body.summary?.trim(),
      short: body.short?.trim(),
      template: body.template?.trim(),
    },
    getBaseUrl(ctx)
  );
});

export default router;
