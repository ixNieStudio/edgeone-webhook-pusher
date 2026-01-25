/**
 * Config Management API Routes
 * 
 * @tag Config
 * @description 系统配置 API，用于管理系统级配置
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { configService } from '../services/config.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { ApiError, ErrorCodes } from '../types/index.js';
import type { SystemConfig, ResetTokenRequest } from '../types/index.js';

const router = new Router({ prefix: '/config' });

// 所有配置路由需要认证
router.use(adminAuth);

/**
 * 获取系统配置
 * @tag Config
 * @summary 获取系统配置
 * @description 获取当前系统配置，敏感信息已脱敏
 * @returns {SystemConfig} 系统配置
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
 * 更新系统配置
 * @tag Config
 * @summary 更新系统配置
 * @description 更新系统配置，如速率限制、数据保留策略等
 * @param {object} body - 配置更新参数
 * @returns {SystemConfig} 更新后的系统配置
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

/**
 * 重置管理员令牌
 * @tag Config
 * @summary 重置管理员令牌
 * @description 生成新的管理员令牌或使用自定义密码。旧令牌将立即失效。
 * 
 * **自定义密码要求：**
 * - 长度至少 12 个字符
 * - 包含至少一个大写字母 (A-Z)
 * - 包含至少一个小写字母 (a-z)
 * - 包含至少一个数字 (0-9)
 * - 包含至少一个特殊字符 (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * 
 * **使用方式：**
 * - 不提供参数：自动生成随机令牌（向后兼容）
 * - 提供 newPassword 和 confirmPassword：使用自定义密码
 * 
 * @param {object} body - 重置参数
 * @param {string} [body.newPassword] - 可选：自定义密码（需符合复杂度要求）
 * @param {string} [body.confirmPassword] - 可选：确认密码（使用自定义密码时必填）
 * @returns {object} 200 - 重置成功
 * @returns {string} return.adminToken - 新的管理员令牌
 * @returns {string} return.message - 提示信息
 * @returns {boolean} return.isCustomPassword - 是否使用自定义密码
 * @response 400 - 密码验证失败
 * @response 401 - 未授权
 */
router.post('/reset-token', async (ctx: AppContext) => {
  try {
    const { newPassword, confirmPassword } = ctx.request.body as ResetTokenRequest || {};
    
    const updatedConfig = await configService.resetAdminToken(
      newPassword,
      confirmPassword
    );
    
    const isCustomPassword = newPassword !== undefined && newPassword !== null && newPassword !== '';
    
    ctx.body = {
      adminToken: updatedConfig.adminToken,
      message: isCustomPassword
        ? '管理员密码已重置为自定义密码。请妥善保管新密码，旧令牌已失效。'
        : '管理员令牌已重置。请妥善保管新令牌，旧令牌已失效。',
      isCustomPassword,
    };
  } catch (error) {
    if (error instanceof Error) {
      // 处理密码验证错误
      if (error.message === 'PASSWORD_INVALID') {
        throw ApiError.badRequest(
          '密码不符合复杂度要求：至少12个字符，包含大小写字母、数字和特殊字符',
          ErrorCodes.INVALID_PARAM
        );
      }
      
      if (error.message === 'PASSWORD_MISMATCH') {
        throw ApiError.badRequest(
          '两次输入的密码不一致',
          ErrorCodes.INVALID_PARAM
        );
      }
      
      if (error.message === 'CONFIRMATION_REQUIRED') {
        throw ApiError.badRequest(
          '使用自定义密码时必须提供确认密码',
          ErrorCodes.INVALID_PARAM
        );
      }
      
      if (error.message === 'Configuration not initialized') {
        throw ApiError.badRequest('系统配置未初始化', ErrorCodes.INVALID_CONFIG);
      }
    }
    
    // 其他错误
    throw ApiError.internal('重置令牌失败，请稍后重试');
  }
});

export default router;
