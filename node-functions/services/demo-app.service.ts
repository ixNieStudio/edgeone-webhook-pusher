/**
 * Demo App Service - 体验应用管理服务
 * Feature: demo-mode
 * 
 * 管理体验模式下的应用，提供独立的 CRUD 操作
 * 自动注入固定配置，仅操作标记为体验的应用
 */

import { appsKV } from '../shared/kv-client.js';
import { now } from '../shared/utils.js';
import type { App, PushMode, MessageType } from '../types/index.js';
import { KVKeys, MessageTypes, ApiError } from '../types/index.js';
import { appService } from './app.service.js';
import { channelService } from './channel.service.js';

// 固定配置常量
const DEMO_TEMPLATE_ID = 'ML6PdjOnLoWqFm7QXTWQDX74b-d9-OTKSpo8WjLY1Hs';
const DEMO_APP_EXPIRY_DAYS = 3;

class DemoAppService {
  /**
   * 创建体验应用
   * 自动注入固定模板ID和第一个可用渠道
   */
  async create(data: { name: string; pushMode: PushMode; messageType?: MessageType }): Promise<App> {
    // 获取第一个渠道
    const channels = await channelService.list();
    if (channels.length === 0) {
      throw ApiError.badRequest('No channels available in demo mode');
    }

    // 确定消息类型，默认为模板消息
    const messageType = data.messageType || MessageTypes.TEMPLATE;

    // 构造完整的创建数据（注入固定配置）
    const createData = {
      name: data.name,
      channelId: channels[0].id,
      pushMode: data.pushMode,
      messageType,
      // 只有模板消息才需要 templateId
      ...(messageType === MessageTypes.TEMPLATE && { templateId: DEMO_TEMPLATE_ID }),
    };

    // 调用原有的 appService.create
    const app = await appService.create(createData);

    // 添加体验标记
    const demoApp: App = {
      ...app,
      isDemoApp: true,
      demoCreatedAt: app.createdAt,
    };

    // 更新应用数据
    await appsKV.put(KVKeys.APP(app.id), demoApp);

    return demoApp;
  }

  /**
   * 获取体验应用列表
   * 仅返回标记为体验的应用
   */
  async list(): Promise<App[]> {
    const allApps = await appService.list();
    return allApps.filter(app => app.isDemoApp === true);
  }

  /**
   * 获取体验应用详情
   * 仅返回标记为体验的应用
   */
  async getById(id: string): Promise<App | null> {
    const app = await appService.getById(id);
    if (!app || !app.isDemoApp) {
      return null;
    }
    return app;
  }

  /**
   * 删除体验应用
   * 仅允许删除标记为体验的应用
   */
  async delete(id: string): Promise<void> {
    const app = await this.getById(id);
    if (!app) {
      throw ApiError.notFound('Demo app not found');
    }
    await appService.delete(id);
  }

  /**
   * 清理过期的体验应用
   * 删除创建时间超过3天的体验应用
   * 
   * @returns 删除的应用数量
   */
  async cleanupExpired(): Promise<number> {
    const demoApps = await this.list();
    const now = Date.now();
    const expiryMs = DEMO_APP_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const app of demoApps) {
      if (app.demoCreatedAt) {
        const createdTime = new Date(app.demoCreatedAt).getTime();
        if (now - createdTime > expiryMs) {
          try {
            await this.delete(app.id);
            deletedCount++;
          } catch (error) {
            console.error(`[DemoAppService] Failed to delete expired app ${app.id}:`, error);
          }
        }
      }
    }

    return deletedCount;
  }
}

export const demoAppService = new DemoAppService();
