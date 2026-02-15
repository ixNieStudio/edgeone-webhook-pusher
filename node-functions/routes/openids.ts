/**
 * OpenID Management API Routes (nested under Apps)
 * 
 * @tag OpenIDs
 * @description OpenID 管理 API，用于管理应用下绑定的微信用户
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
 * 获取 OpenID 列表
 * @tag OpenIDs
 * @summary 获取应用下的 OpenID 列表
 * @description 返回指定应用下绑定的所有微信用户 OpenID
 * @param {string} appId - 应用 ID
 * @returns {OpenID[]} OpenID 列表
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
 * 添加 OpenID
 * @tag OpenIDs
 * @summary 添加 OpenID
 * @description 为指定应用添加一个新的微信用户 OpenID
 * @param {string} appId - 应用 ID
 * @param {CreateOpenIDInput} body - OpenID 创建参数
 * @returns {OpenID} 创建的 OpenID 信息
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
 * 获取 OpenID 详情
 * @tag OpenIDs
 * @summary 获取 OpenID 详情
 * @description 根据 ID 获取单个 OpenID 的详细信息
 * @param {string} appId - 应用 ID
 * @param {string} id - OpenID 记录 ID
 * @returns {OpenID} OpenID 详情
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
 * 更新 OpenID
 * @tag OpenIDs
 * @summary 更新 OpenID 信息
 * @description 更新指定 OpenID 的备注等信息
 * @param {string} appId - 应用 ID
 * @param {string} id - OpenID 记录 ID
 * @param {UpdateOpenIDInput} body - 更新参数
 * @returns {OpenID} 更新后的 OpenID 信息
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
 * 删除 OpenID
 * @tag OpenIDs
 * @summary 删除 OpenID
 * @description 从应用中删除指定的 OpenID
 * @param {string} appId - 应用 ID
 * @param {string} id - OpenID 记录 ID
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
