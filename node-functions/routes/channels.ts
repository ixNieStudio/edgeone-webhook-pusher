/**
 * Channel Management API Routes
 * 
 * GET /channels - 获取渠道列表
 * POST /channels - 创建渠道
 * GET /channels/:id - 获取渠道详情
 * PUT /channels/:id - 更新渠道
 * DELETE /channels/:id - 删除渠道
 * 
 * 所有路由需要 Admin Token 认证
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { channelService } from '../services/channel.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import type { CreateChannelInput, UpdateChannelInput } from '../types/index.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/channels' });

// 所有渠道路由需要认证
router.use(adminAuth);

/**
 * GET /channels - 获取渠道列表
 */
router.get('/', async (ctx: AppContext) => {
  const channels = await channelService.list();
  // 脱敏敏感字段
  ctx.body = channels.map((ch) => channelService.maskChannel(ch));
});

/**
 * POST /channels - 创建渠道
 */
router.post('/', async (ctx: AppContext) => {
  const body = ctx.request.body as CreateChannelInput | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  const channel = await channelService.create(body);
  ctx.status = 201;
  ctx.body = channelService.maskChannel(channel);
});

/**
 * GET /channels/:id - 获取渠道详情
 */
router.get('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  const channel = await channelService.getById(id);

  if (!channel) {
    throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
  }

  ctx.body = channelService.maskChannel(channel);
});

/**
 * PUT /channels/:id - 更新渠道
 */
router.put('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  const body = ctx.request.body as UpdateChannelInput | undefined;

  if (!body) {
    throw ApiError.badRequest('Request body is required');
  }

  const channel = await channelService.update(id, body);
  ctx.body = channelService.maskChannel(channel);
});

/**
 * DELETE /channels/:id - 删除渠道
 */
router.delete('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  await channelService.delete(id);
  ctx.status = 204;
});

export default router;
