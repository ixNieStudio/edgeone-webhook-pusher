/**
 * App Management API Routes
 * 
 * @tag Apps
 * @description 应用管理 API，用于管理业务应用及其推送配置
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
 * 获取应用列表
 * @tag Apps
 * @summary 获取所有应用
 * @description 返回系统中所有应用的列表，包含每个应用绑定的 OpenID 数量
 * @returns {App[]} 应用列表
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
 * 创建应用
 * @tag Apps
 * @summary 创建新应用
 * @description 创建一个新的业务应用，需要关联已存在的渠道
 * @param {CreateAppInput} body - 应用创建参数
 * @returns {App} 创建的应用信息
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
 * 获取应用详情
 * @tag Apps
 * @summary 获取应用详情
 * @description 根据 ID 获取单个应用的详细信息，包含 OpenID 数量
 * @param {string} id - 应用 ID
 * @returns {App} 应用详情
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
 * 更新应用
 * @tag Apps
 * @summary 更新应用信息
 * @description 更新指定应用的配置信息
 * @param {string} id - 应用 ID
 * @param {UpdateAppInput} body - 更新参数
 * @returns {App} 更新后的应用信息
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
 * 删除应用
 * @tag Apps
 * @summary 删除应用
 * @description 删除指定的应用。删除时会同时删除所有绑定的 OpenID
 * @param {string} id - 应用 ID
 */
router.delete('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  await appService.delete(id);
  ctx.status = 204;
});

export default router;
