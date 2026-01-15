/**
 * Stats Routes
 * Feature: system-restructure
 * 
 * Provides statistics endpoint for the dashboard.
 */

import { channelService } from '../modules/channel/service.js';
import { appService } from '../modules/app/service.js';
import { historyService } from '../modules/history/service.js';
import { successResponse } from '../shared/error-codes.js';

/**
 * Register stats routes
 * @param {import('@koa/router').default} router
 */
export function registerStatsRoutes(router) {
  /**
   * GET /api/stats
   * Get dashboard statistics
   */
  router.get('/stats', async (ctx) => {
    // Get counts
    const channels = await channelService.list();
    const apps = await appService.list();
    const messagesResult = await historyService.list({ page: 1, pageSize: 5 });

    // Format recent messages for dashboard
    const recentMessages = messagesResult.items.map((msg) => ({
      id: msg.id,
      title: msg.title,
      type: msg.type,
      success: msg.results?.every((r) => r.success) ?? false,
      createdAt: msg.createdAt,
    }));

    ctx.body = successResponse({
      channelCount: channels.length,
      appCount: apps.length,
      messageCount: messagesResult.total,
      recentMessages,
    });
  });
}
