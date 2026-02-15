/**
 * Channel Management API Routes
 * 
 * @tag Channels
 * @description 渠道管理 API，用于管理消息发送通道（如微信公众号）
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { channelService } from '../services/channel.service.js';
import { wechatService } from '../services/wechat.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import type { CreateChannelInput, UpdateChannelInput } from '../types/index.js';
import { ApiError, ErrorCodes } from '../types/index.js';

const router = new Router({ prefix: '/channels' });

// 所有渠道路由需要认证
router.use(adminAuth);

/**
 * 获取渠道列表
 * @tag Channels
 * @summary 获取所有渠道
 * @description 返回系统中配置的所有渠道列表，敏感信息已脱敏
 * @returns {Channel[]} 渠道列表
 */
router.get('/', async (ctx: AppContext) => {
  const channels = await channelService.list();
  // 脱敏敏感字段
  ctx.body = channels.map((ch) => channelService.maskChannel(ch));
});

/**
 * 创建渠道
 * @tag Channels
 * @summary 创建新渠道
 * @description 创建一个新的消息发送渠道
 * @param {CreateChannelInput} body - 渠道创建参数
 * @returns {Channel} 创建的渠道信息
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
 * 获取渠道详情
 * @tag Channels
 * @summary 获取渠道详情
 * @description 根据 ID 获取单个渠道的详细信息
 * @param {string} id - 渠道 ID
 * @returns {Channel} 渠道详情
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
 * 更新渠道
 * @tag Channels
 * @summary 更新渠道信息
 * @description 更新指定渠道的配置信息
 * @param {string} id - 渠道 ID
 * @param {UpdateChannelInput} body - 更新参数
 * @returns {Channel} 更新后的渠道信息
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
 * 删除渠道
 * @tag Channels
 * @summary 删除渠道
 * @description 删除指定的渠道。如果有应用引用此渠道，将无法删除
 * @param {string} id - 渠道 ID
 */
router.delete('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;
  await channelService.delete(id);
  ctx.status = 204;
});

/**
 * 验证渠道配置
 * @tag Channels
 * @summary 验证渠道配置
 * @description 验证微信公众号配置是否正确，通过尝试获取 Access Token 来验证
 * @param {string} id - 渠道 ID
 * @returns {object} 验证结果
 */
router.get('/:id/verify', async (ctx: AppContext) => {
  const { id } = ctx.params;
  const channel = await channelService.getById(id);

  if (!channel) {
    throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
  }

  const result = await wechatService.verifyChannelConfig(channel);
  ctx.body = result;
});

/**
 * 获取渠道 Token 维护状态
 * @tag Channels
 * @summary 获取 Token 状态
 * @description 获取微信公众号 Access Token 的维护状态，包括最后刷新时间、是否成功、过期时间等
 * @param {string} id - 渠道 ID
 * @returns {TokenStatus} Token 维护状态
 */
router.get('/:id/token-status', async (ctx: AppContext) => {
  const { id } = ctx.params;
  const channel = await channelService.getById(id);

  if (!channel) {
    throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
  }

  const status = await wechatService.getTokenStatus(id);
  ctx.body = status || { valid: false, lastRefreshAt: 0, lastRefreshSuccess: false };
});

export default router;
