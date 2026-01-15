/**
 * Initialization API Routes
 * 
 * GET /init/status - 检查初始化状态
 * POST /init - 执行初始化
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { configService } from '../services/config.service.js';
import { generateAdminToken, now } from '../shared/utils.js';
import type { SystemConfig } from '../types/index.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/init' });

/**
 * GET /init/status - 检查初始化状态
 */
router.get('/status', async (ctx: AppContext) => {
  const initialized = await configService.exists();
  ctx.body = { initialized };
});

/**
 * POST /init - 执行初始化
 */
router.post('/', async (ctx: AppContext) => {
  // 检查是否已初始化
  const isInit = await configService.exists();
  if (isInit) {
    throw ApiError.badRequest('Application is already initialized', ErrorCodes.INVALID_PARAM);
  }

  // 解析可选的微信配置
  const body = ctx.request.body as { wechat?: { appId?: string; appSecret?: string; templateId?: string } } | undefined;
  const wechatConfig = body?.wechat;

  // 生成 Admin Token
  const adminToken = generateAdminToken();
  const timestamp = now();

  // 创建初始配置
  const config: SystemConfig = {
    adminToken,
    wechat: wechatConfig ? {
      appId: wechatConfig.appId || '',
      appSecret: wechatConfig.appSecret || '',
      templateId: wechatConfig.templateId,
    } : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await configService.saveConfig(config);

  ctx.body = {
    adminToken,
    message: 'Initialization successful. Please save your Admin Token securely.',
  };
});

export default router;
