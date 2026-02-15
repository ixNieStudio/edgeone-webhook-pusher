/**
 * Authentication API Routes
 * 
 * @tag Auth
 * @description 认证 API，用于验证 Admin Token
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { configService } from '../services/config.service.js';
import { ApiError } from '../types/index.js';

const router = new Router({ prefix: '/auth' });

/**
 * 验证 Token
 * @tag Auth
 * @summary 验证 Admin Token
 * @description 验证提供的 Admin Token 是否有效
 * @returns {object} 验证结果
 */
router.post('/validate', async (ctx: AppContext) => {
  const authHeader = ctx.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    throw ApiError.unauthorized('Token is required');
  }

  // 获取系统配置验证 token
  const config = await configService.getConfig();
  
  if (!config) {
    throw ApiError.unauthorized('System not initialized');
  }

  if (config.adminToken !== token) {
    throw ApiError.unauthorized('Invalid admin token');
  }

  ctx.body = {
    valid: true,
    message: 'Token is valid',
  };
});

export default router;
