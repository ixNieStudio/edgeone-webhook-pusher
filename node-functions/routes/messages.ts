/**
 * Message History API Routes
 * 
 * GET /messages - 获取消息历史列表
 * GET /messages/:id - 获取消息详情
 * 
 * 所有路由需要 Admin Token 认证
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { messageService } from '../services/message.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/messages' });

// 所有消息路由需要认证
router.use(adminAuth);

/**
 * GET /messages - 获取消息历史列表
 * Query params: page, pageSize, appId, startDate, endDate
 */
router.get('/', async (ctx: AppContext) => {
  const { page, pageSize, appId, startDate, endDate } = ctx.query;

  const pageNum = parseInt(page as string || '1', 10);
  const pageSizeNum = parseInt(pageSize as string || '20', 10);

  // 验证参数
  if (pageNum < 1) {
    throw ApiError.badRequest('page must be >= 1');
  }
  if (pageSizeNum < 1 || pageSizeNum > 100) {
    throw ApiError.badRequest('pageSize must be between 1 and 100');
  }

  const result = await messageService.list({
    page: pageNum,
    pageSize: pageSizeNum,
    appId: appId as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });

  // 返回带分页信息的响应
  ctx.body = {
    items: result.messages,
    pagination: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize),
    },
  };
});

/**
 * GET /messages/:id - 获取消息详情
 */
router.get('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;

  const message = await messageService.get(id);
  if (!message) {
    throw ApiError.notFound('Message not found', ErrorCodes.MESSAGE_NOT_FOUND);
  }

  ctx.body = message;
});

export default router;
