/**
 * Message History API Routes
 * 
 * @tag Messages
 * @description 消息历史 API，用于查询推送消息的历史记录
 */

import Router from '@koa/router';
import type { AppContext } from '../types/context.js';
import { messageService } from '../services/message.service.js';
import { appService } from '../services/app.service.js';
import { openidService } from '../services/openid.service.js';
import { adminAuth } from '../middleware/admin-auth.js';
import { ApiError, ErrorCodes } from '../types/index.js';
import type { Message, App } from '../types/index.js';

const router = new Router({ prefix: '/messages' });

// 所有消息路由需要认证
router.use(adminAuth);

// 缓存应用信息和用户信息，避免重复查询
interface AppCache {
  [appId: string]: App | null;
}

interface UserCache {
  [key: string]: { nickname?: string; avatar?: string } | null;
}

/**
 * 丰富消息数据，添加应用名称和用户信息（优化版）
 */
async function enrichMessages(messages: Message[]): Promise<Message[]> {
  if (messages.length === 0) return [];

  // 批量收集需要查询的 ID
  const appIds = new Set<string>();
  const channelOpenIds = new Map<string, Set<string>>(); // channelId -> Set<openId>

  for (const msg of messages) {
    if (msg.appId) {
      appIds.add(msg.appId);
    }
    if (msg.direction === 'inbound' && msg.openId && msg.channelId) {
      if (!channelOpenIds.has(msg.channelId)) {
        channelOpenIds.set(msg.channelId, new Set());
      }
      channelOpenIds.get(msg.channelId)!.add(msg.openId);
    }
  }

  // 批量查询应用信息
  const appCache: AppCache = {};
  const appPromises = Array.from(appIds).map(async (appId) => {
    const app = await appService.getById(appId);
    appCache[appId] = app;
  });
  await Promise.all(appPromises);

  // 批量查询用户信息
  const userCache: UserCache = {};
  const userPromises: Promise<void>[] = [];
  
  for (const [channelId, openIds] of channelOpenIds.entries()) {
    // 获取该渠道下的所有应用（只查询一次）
    const channelAppsPromise = appService.listByChannel(channelId).then(async (apps) => {
      // 对每个 openId，尝试从该渠道的应用中查找用户信息
      for (const openId of openIds) {
        const cacheKey = `${channelId}:${openId}`;
        
        // 并行查询所有应用中的该 openId
        const openIdPromises = apps.map(app => 
          openidService.findByOpenId(app.id, openId)
        );
        const openIdRecords = await Promise.all(openIdPromises);
        
        // 找到第一个有用户信息的记录
        const userInfo = openIdRecords.find(record => 
          record && (record.nickname || record.avatar)
        );
        
        userCache[cacheKey] = userInfo ? {
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
        } : null;
      }
    });
    
    userPromises.push(channelAppsPromise);
  }
  
  await Promise.all(userPromises);

  // 填充消息数据
  const enriched: Message[] = messages.map(msg => {
    const enrichedMsg = { ...msg };

    // 填充应用名称
    if (msg.appId && appCache[msg.appId]) {
      enrichedMsg.appName = appCache[msg.appId]!.name;
    }

    // 填充用户信息
    if (msg.direction === 'inbound' && msg.openId && msg.channelId) {
      const cacheKey = `${msg.channelId}:${msg.openId}`;
      const user = userCache[cacheKey];
      if (user) {
        enrichedMsg.userNickname = user.nickname;
        enrichedMsg.userAvatar = user.avatar;
      }
    }

    return enrichedMsg;
  });

  return enriched;
}

/**
 * 获取消息历史列表
 * @tag Messages
 * @summary 获取消息历史
 * @description 分页获取消息历史记录，支持按渠道、应用、用户、方向和日期筛选
 * @param {number} page - 页码，默认 1
 * @param {number} pageSize - 每页数量，默认 20，最大 100
 * @param {string} channelId - 按渠道筛选
 * @param {string} appId - 按应用筛选
 * @param {string} openId - 按用户筛选
 * @param {string} direction - 按方向筛选（inbound/outbound）
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {object} 消息列表和分页信息
 */
router.get('/', async (ctx: AppContext) => {
  const { page, pageSize, channelId, appId, openId, direction, startDate, endDate } = ctx.query;

  const pageNum = parseInt(page as string || '1', 10);
  const pageSizeNum = parseInt(pageSize as string || '20', 10);

  // 验证参数
  if (pageNum < 1) {
    throw ApiError.badRequest('page must be >= 1');
  }
  if (pageSizeNum < 1 || pageSizeNum > 100) {
    throw ApiError.badRequest('pageSize must be between 1 and 100');
  }

  // 验证 direction 参数
  const validDirections = ['inbound', 'outbound'];
  if (direction && !validDirections.includes(direction as string)) {
    throw ApiError.badRequest('direction must be inbound or outbound');
  }

  const result = await messageService.list({
    page: pageNum,
    pageSize: pageSizeNum,
    channelId: channelId as string | undefined,
    appId: appId as string | undefined,
    openId: openId as string | undefined,
    direction: direction as 'inbound' | 'outbound' | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });

  // 丰富消息数据
  const enrichedMessages = await enrichMessages(result.messages);

  // 返回带分页信息的响应
  ctx.body = {
    items: enrichedMessages,
    pagination: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize),
    },
  };
});

/**
 * 获取消息详情
 * @tag Messages
 * @summary 获取消息详情
 * @description 根据 ID 获取单条消息的详细信息，包含发送结果
 * @param {string} id - 消息 ID
 * @returns {Message} 消息详情
 */
router.get('/:id', async (ctx: AppContext) => {
  const { id } = ctx.params;

  const message = await messageService.get(id);
  if (!message) {
    throw ApiError.notFound('Message not found', ErrorCodes.MESSAGE_NOT_FOUND);
  }

  // 丰富消息数据
  const [enrichedMessage] = await enrichMessages([message]);

  ctx.body = enrichedMessage;
});

export default router;
