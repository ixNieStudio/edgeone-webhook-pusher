/**
 * BindCode API Routes
 * 
 * @tag BindCode
 * @description 绑定码管理 API，用于生成和查询用户绑定码
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { bindCodeService } from '../services/bindcode.service.js';
import { appService } from '../services/app.service.js';
import { channelService } from '../services/channel.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/apps/:appId/bindcode' });

// 所有绑定码路由需要认证
router.use(adminAuth);

/**
 * 生成绑定码
 * @tag BindCode
 * @summary 生成绑定码
 * @description 为指定应用生成一个新的绑定码，有效期 5 分钟。如果是认证服务号，还会生成二维码。
 * @param {string} appId - 应用 ID
 * @returns {CreateBindCodeResponse} 绑定码信息
 */
router.post('/', async (ctx: AppContext) => {
  const { appId } = ctx.params;

  // 验证应用存在
  const app = await appService.getById(appId);
  if (!app) {
    throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
  }

  // 验证渠道存在
  const channel = await channelService.getById(app.channelId);
  if (!channel) {
    throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
  }

  // 传入 channel 以尝试生成二维码
  const bindCode = await bindCodeService.create({
    appId,
    channelId: app.channelId,
  }, channel);

  ctx.status = 201;
  ctx.body = {
    bindCode: bindCode.code,
    expiresAt: bindCode.expiresAt,
    qrCodeUrl: bindCode.qrCodeUrl, // 仅认证服务号有值
  };
});

/**
 * 查询绑定码状态
 * @tag BindCode
 * @summary 查询绑定码状态
 * @description 查询指定绑定码的当前状态（等待绑定/已绑定/已过期）
 * @param {string} appId - 应用 ID
 * @param {string} code - 绑定码
 * @returns {BindCodeStatusResponse} 绑定码状态
 */
router.get('/:code', async (ctx: AppContext) => {
  const { appId, code } = ctx.params;

  // 验证应用存在
  const app = await appService.getById(appId);
  if (!app) {
    throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
  }

  const status = await bindCodeService.getStatus(code);
  ctx.body = status;
});

export default router;
