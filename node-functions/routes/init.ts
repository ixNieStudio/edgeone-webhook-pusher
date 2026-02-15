/**
 * Initialization API Routes
 * 
 * @tag Init
 * @description 系统初始化 API，用于首次部署时初始化系统
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { configService } from '../services/config.service.js';
import { generateAdminToken, now } from '../shared/utils.js';
import type { SystemConfig } from '../types/index.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/init' });

/**
 * 检查初始化状态
 * @tag Init
 * @summary 检查初始化状态
 * @description 检查系统是否已完成初始化
 * @returns {object} 初始化状态
 */
router.get('/status', async (ctx: AppContext) => {
  const initialized = await configService.exists();
  ctx.body = { initialized };
});

/**
 * 执行初始化
 * @tag Init
 * @summary 初始化系统
 * @description 首次初始化系统，生成 Admin Token。此操作只能执行一次
 * @returns {object} 初始化结果，包含 Admin Token
 */
router.post('/', async (ctx: AppContext) => {
  // 检查是否已初始化
  const isInit = await configService.exists();
  if (isInit) {
    throw ApiError.badRequest('Application is already initialized', ErrorCodes.INVALID_PARAM);
  }

  // 生成 Admin Token
  const adminToken = generateAdminToken();
  const timestamp = now();

  // 创建初始配置（不再包含 wechat 配置，微信配置在渠道中管理）
  const config: SystemConfig = {
    adminToken,
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
