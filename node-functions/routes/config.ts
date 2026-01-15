/**
 * Config Management API Routes
 * 
 * GET /config - 获取应用配置
 * PUT /config - 更新应用配置
 * 
 * 所有路由需要 Admin Token 认证
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { configService } from '../services/config.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { ApiError, ErrorCodes } from '../types/index.js';
import type { SystemConfig } from '../types/index.js';

const router = new Router({ prefix: '/config' });

// 所有配置路由需要认证
router.use(adminAuth);

/**
 * GET /config - 获取应用配置
 */
router.get('/', async (ctx: AppContext) => {
  const config = await configService.getConfig();
  if (!config) {
    throw ApiError.badRequest('Configuration not found', ErrorCodes.INVALID_CONFIG);
  }

  // 脱敏敏感字段
  ctx.body = configService.maskConfig(config);
});

/**
 * PUT /config - 更新应用配置
 */
router.put('/', async (ctx: AppContext) => {
  const updates = ctx.request.body as Partial<SystemConfig> | undefined;

  if (!updates || typeof updates !== 'object') {
    throw ApiError.badRequest('Request body must be an object');
  }

  const updatedConfig = await configService.updateConfig(updates);

  // 脱敏敏感字段
  ctx.body = configService.maskConfig(updatedConfig);
});

export default router;
