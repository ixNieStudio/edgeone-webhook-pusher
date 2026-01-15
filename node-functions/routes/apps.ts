/**
 * App Management API Routes
 * 
 * GET /apps - 获取应用列表
 * POST /apps - 创建应用
 * GET /apps/:id - 获取应用详情
 * PUT /apps/:id - 更新应用
 * DELETE /apps/:id - 删除应用
 * 
 * 所有路由需要 Admin Token 认证
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { appService } from '../services/app.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import type { CreateAppInput, UpdateAppInput } from '../types/index.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/apps' });

// 所有应用路由需要认证
router.use(adminAuth);

/**
 * GET /apps - 获取应用列表
 */
router.get('/', async (ctx: AppContext) => {
  const apps = await appService.list();

  // 添加 openIdCount 到每个应用
  const appsWithCount = await Promise.all(
    apps.map(async (app) => ({
      ...app,
      openIdCount: await appService.getOpenIDCount(app.id),
    }))
  );

  ctx.body = appsWithCount;
});

/**
 * POST /apps - 创建应用
 */
router.post('/', async (ctx: AppContext) => {
  const body = ctx.request.body as CreateAppInput | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  const app = await appService.create(body);
  ctx.status = 201;
  ctx.body = app;
});

/**
 * GET /apps/:id - 获取应用详情
 */
router.get('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  const app = await appService.getById(id);

  if (!app) {
    throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
  }

  // 添加 openIdCount
  const openIdCount = await appService.getOpenIDCount(id);
  ctx.body = { ...app, openIdCount };
});

/**
 * PUT /apps/:id - 更新应用
 */
router.put('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  const body = ctx.request.body as UpdateAppInput | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  const app = await appService.update(id, body);
  ctx.body = app;
});

/**
 * DELETE /apps/:id - 删除应用
 */
router.delete('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  await appService.delete(id);
  ctx.status = 204;
});

export default router;
