/**
 * Stats API Routes
 * 
 * @tag Stats
 * @description 统计数据 API，用于获取系统概览统计
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { messageService } from '../services/message.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { adminIndexService } from '../services/admin-index.service.js';
import { appsKV } from '../shared/kv-client.js';
import { KVKeys } from '../types/constants.js';

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
  const [indexStatus, totalMessages, appMeta] = await Promise.all([
    adminIndexService.getIndexStatus(),
    messageService.getTotalCount(),
    appsKV.get<{ totalRecipients?: number }>(KVKeys.APP_META),
  ]);

  ctx.body = {
    channels: indexStatus.authProfiles.total,
    apps: indexStatus.apps.total,
    openIds: appMeta?.totalRecipients ?? 0,
    messages: totalMessages,
  };
});

export default router;
