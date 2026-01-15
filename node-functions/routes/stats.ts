/**
 * Stats API Routes
 * 
 * GET /stats - 获取系统统计数据
 * 
 * 需要 Admin Token 认证
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
 * GET /stats - 获取系统统计数据
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
