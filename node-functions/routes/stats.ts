/**
 * Stats API Routes
 * 
 * @tag Stats
 * @description 统计数据 API，用于获取系统概览统计
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { channelService } from '../services/channel.service.js';
import { appService } from '../services/app.service.js';
import { openidService } from '../services/openid.service.js';
import { messageService } from '../services/message.service.js';
import { adminAuth } from '../middleware/admin-auth.js';

const router = new Router({ prefix: '/stats' });

// 需要认证
router.use(adminAuth);

/**
 * 获取统计数据
 * @tag Stats
 * @summary 获取系统统计数据
 * @description 获取系统概览统计，包括渠道数、应用数、OpenID 数和消息数
 * @returns {object} 统计数据
 */
router.get('/', async (ctx: AppContext) => {
  const [channels, apps, messageStats] = await Promise.all([
    channelService.list(),
    appService.list(),
    messageService.getStats(),
  ]);

  // 计算 OpenID 总数
  let openIds = 0;
  for (const app of apps) {
    openIds += await appService.getOpenIDCount(app.id);
  }

  ctx.body = {
    channels: channels.length,
    apps: apps.length,
    openIds,
    messages: messageStats.total,
  };
});

export default router;
