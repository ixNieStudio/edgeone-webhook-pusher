/**
 * Demo App Management API Routes
 * Feature: demo-mode
 * 
 * @tag DemoApps
 * @description 体验应用管理 API，无需认证，仅在体验模式启用时可用
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { demoAppService } from '../services/demo-app.service.js';
import { appService } from '../services/app.service.js';
import { bindCodeService } from '../services/bindcode.service.js';
import { channelService } from '../services/channel.service.js';
import { cleanupService } from '../services/cleanup.service.js';
import { extractBaseUrl } from '../middleware/kv-base-url.js';
import { ApiError } from '../types/index.js';
import type { PushMode, MessageType } from '../types/app.js';

const router = new Router({ prefix: '/demo/apps' });

// 注意：此路由不使用 adminAuth 中间件

/**
 * 中间件：检查体验模式是否启用
 */
router.use(async (ctx: AppContext, next) => {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  if (!isDemoMode) {
    ctx.status = 404;
    ctx.body = { code: 404, message: 'Demo mode is not enabled' };
    return;
  }
  await next();
});

/**
 * 计算剩余天数
 */
function calculateDaysRemaining(createdAt?: string): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diff = 3 - Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/**
 * 获取体验应用列表
 * @tag DemoApps
 * @summary 获取所有体验应用
 * @description 返回所有标记为体验的应用列表
 * @returns {App[]} 体验应用列表
 */
router.get('/', async (ctx: AppContext) => {
  // 触发清理任务（传递 baseUrl）
  const baseUrl = extractBaseUrl(ctx);
  cleanupService.triggerCleanup(baseUrl).catch(console.error);

  const apps = await demoAppService.list();

  // 添加 openIdCount 和剩余天数
  const appsWithInfo = await Promise.all(
    apps.map(async (app) => {
      const openIdCount = await appService.getOpenIDCount(app.id);
      const daysRemaining = calculateDaysRemaining(app.demoCreatedAt);

      return {
        ...app,
        openIdCount,
        daysRemaining,
      };
    })
  );

  ctx.body = appsWithInfo;
});

/**
 * 创建体验应用
 * @tag DemoApps
 * @summary 创建新的体验应用
 * @description 创建一个新的体验应用，自动使用固定模板和第一个渠道
 * @param {object} body - 应用创建参数
 * @returns {App} 创建的体验应用信息
 */
router.post('/', async (ctx: AppContext) => {
  // 触发清理任务（传递 baseUrl）
  const baseUrl = extractBaseUrl(ctx);
  cleanupService.triggerCleanup(baseUrl).catch(console.error);

  const body = ctx.request.body as { name: string; pushMode: PushMode; messageType?: MessageType } | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  if (!body.name || !body.name.trim()) {
    throw ApiError.badRequest('App name is required');
  }

  if (!body.pushMode) {
    throw ApiError.badRequest('pushMode is required');
  }

  const app = await demoAppService.create(body);
  ctx.status = 201;
  ctx.body = app;
});

/**
 * 获取体验应用详情
 * @tag DemoApps
 * @summary 获取体验应用详情
 * @description 根据 ID 获取单个体验应用的详细信息
 * @param {string} id - 应用 ID
 * @returns {App} 体验应用详情
 */
router.get('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  const app = await demoAppService.getById(id);

  if (!app) {
    throw ApiError.notFound('Demo app not found');
  }

  const openIdCount = await appService.getOpenIDCount(id);
  const daysRemaining = calculateDaysRemaining(app.demoCreatedAt);

  ctx.body = { ...app, openIdCount, daysRemaining };
});

/**
 * 删除体验应用
 * @tag DemoApps
 * @summary 删除体验应用
 * @description 删除指定的体验应用。删除时会同时删除所有绑定的 OpenID
 * @param {string} id - 应用 ID
 */
router.delete('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  await demoAppService.delete(id);
  ctx.status = 204;
});

/**
 * 生成绑定码
 * @tag DemoApps
 * @summary 为体验应用生成绑定码
 * @description 生成一个 6 位数字绑定码，用于用户绑定微信。如果渠道支持，还会生成二维码
 * @param {string} id - 应用 ID
 * @returns {object} 绑定码信息（包含二维码 URL，如果可用）
 */
router.post('/:id/bindcode', async (ctx: AppContext) => {
  const { id } = ctx.params;
  
  // 验证应用是否存在且为体验应用
  const app = await demoAppService.getById(id);
  if (!app) {
    throw ApiError.notFound('Demo app not found');
  }

  // 获取渠道信息（用于生成二维码）
  const channel = await channelService.getById(app.channelId);

  // 生成绑定码（传入完整的输入参数和渠道信息）
  const bindCode = await bindCodeService.create(
    {
      appId: id,
      channelId: app.channelId,
    },
    channel || undefined
  );

  ctx.status = 201;
  ctx.body = {
    bindCode: bindCode.code,
    expiresAt: bindCode.expiresAt,
    qrCodeUrl: bindCode.qrCodeUrl, // 二维码图片 URL（如果可用）
  };
});

/**
 * 查询绑定码状态
 * @tag DemoApps
 * @summary 查询绑定码状态
 * @description 查询指定绑定码的状态（pending/bound/expired）
 * @param {string} id - 应用 ID
 * @param {string} code - 绑定码
 * @returns {object} 绑定码状态信息
 */
router.get('/:id/bindcode/:code', async (ctx: AppContext) => {
  const { id, code } = ctx.params;

  // 验证应用是否存在且为体验应用
  const app = await demoAppService.getById(id);
  if (!app) {
    throw ApiError.notFound('Demo app not found');
  }

  const status = await bindCodeService.getStatus(code);
  ctx.body = status;
});

export default router;
