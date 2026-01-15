/**
 * OpenID Management API Routes (nested under Apps)
 * 
 * GET /apps/:appId/openids - 获取应用下的 OpenID 列表
 * POST /apps/:appId/openids - 添加 OpenID
 * GET /apps/:appId/openids/:id - 获取 OpenID 详情
 * PUT /apps/:appId/openids/:id - 更新 OpenID
 * DELETE /apps/:appId/openids/:id - 删除 OpenID
 * 
 * 所有路由需要 Admin Token 认证
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { openidService } from '../services/openid.service.js';
import { appService } from '../services/app.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import type { CreateOpenIDInput, UpdateOpenIDInput } from '../types/index.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/apps/:appId/openids' });

// 所有 OpenID 路由需要认证
router.use(adminAuth);

/**
 * GET /apps/:appId/openids - 获取应用下的 OpenID 列表
 */
router.get('/', async (ctx: AppContext) => {
  const { appId } = ctx.params;

  // 验证应用存在
  const app = await appService.getById(appId);
  if (!app) {
    throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
  }

  const openids = await openidService.listByApp(appId);
  ctx.body = openids;
});

/**
 * POST /apps/:appId/openids - 添加 OpenID
 */
router.post('/', async (ctx: AppContext) => {
  const { appId } = ctx.params;
  const body = ctx.request.body as CreateOpenIDInput | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  const openid = await openidService.create(appId, body);
  ctx.status = 201;
  ctx.body = openid;
});

/**
 * GET /apps/:appId/openids/:id - 获取 OpenID 详情
 */
router.get('/:id', async (ctx: AppContext) => {
  const { appId, id } = ctx.params;

  const openid = await openidService.getById(id);
  if (!openid) {
    throw ApiError.notFound('OpenID not found', ErrorCodes.OPENID_NOT_FOUND);
  }

  // 验证 OpenID 属于指定的应用
  if (openid.appId !== appId) {
    throw ApiError.notFound('OpenID not found in this app', ErrorCodes.OPENID_NOT_FOUND);
  }

  ctx.body = openid;
});

/**
 * PUT /apps/:appId/openids/:id - 更新 OpenID
 */
router.put('/:id', async (ctx: AppContext) => {
  const { appId, id } = ctx.params;
  const body = ctx.request.body as UpdateOpenIDInput | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  // 验证 OpenID 存在且属于该应用
  const existing = await openidService.getById(id);
  if (!existing) {
    throw ApiError.notFound('OpenID not found', ErrorCodes.OPENID_NOT_FOUND);
  }
  if (existing.appId !== appId) {
    throw ApiError.notFound('OpenID not found in this app', ErrorCodes.OPENID_NOT_FOUND);
  }

  const openid = await openidService.update(id, body);
  ctx.body = openid;
});

/**
 * DELETE /apps/:appId/openids/:id - 删除 OpenID
 */
router.delete('/:id', async (ctx: AppContext) => {
  const { appId, id } = ctx.params;

  // 验证 OpenID 存在且属于该应用
  const existing = await openidService.getById(id);
  if (!existing) {
    throw ApiError.notFound('OpenID not found', ErrorCodes.OPENID_NOT_FOUND);
  }
  if (existing.appId !== appId) {
    throw ApiError.notFound('OpenID not found in this app', ErrorCodes.OPENID_NOT_FOUND);
  }

  await openidService.delete(id);
  ctx.status = 204;
});

export default router;
