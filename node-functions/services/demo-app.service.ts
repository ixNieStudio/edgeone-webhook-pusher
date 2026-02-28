/**
 * Demo App Service - 体验应用管理服务
 * Feature: demo-mode
 * 
 * 设计原则:
 * - 使用独立的 KV key 前缀 (demo_app:{id})
 * - 不依赖 app.service，直接操作 KV
 * - 使用独立的索引列表 (demo_app_list)
 * - 自动计算过期时间，简化清理逻辑
 */

import { appsKV } from '../shared/kv-client.js';
import { generateId, generateAppKey, now } from '../shared/utils.js';
import type { DemoApp, CreateDemoAppInput } from '../types/demo-app.js';
import { KVKeys, MessageTypes, ApiError } from '../types/index.js';
import { channelService } from './channel.service.js';

// 固定配置常量
const DEMO_TEMPLATE_ID = 'ML6PdjOnLoWqFm7QXTWQDX74b-d9-OTKSpo8WjLY1Hs';
const DEMO_APP_EXPIRY_DAYS = 3;

// KV Key 生成函数
const DEMO_APP_KEY = (id: string) => `demo_app:${id}`;
const DEMO_APP_LIST_KEY = 'demo_app_list';

class DemoAppService {
  /**
   * 创建体验应用
   * 自动注入固定模板ID和第一个可用渠道
   */
  async create(data: CreateDemoAppInput): Promise<DemoApp> {
    // 获取第一个渠道
    const channels = await channelService.list();
    if (channels.length === 0) {
      throw ApiError.badRequest('No channels available in demo mode');
    }

    // 确定消息类型，默认为模板消息
    const messageType = data.messageType || MessageTypes.TEMPLATE;

    // 生成ID和Key
    const id = generateId();
    const key = await generateAppKey();
    const timestamp = now();

    // 计算过期时间
    const expiresAt = new Date(
      Date.now() + DEMO_APP_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // 构造体验应用对象
    const demoApp: DemoApp = {
      id,
      key,
      name: data.name,
      channelId: channels[0].id,
      pushMode: data.pushMode,
      messageType,
      // 只有模板消息才需要 templateId
      ...(messageType === MessageTypes.TEMPLATE && { templateId: DEMO_TEMPLATE_ID }),
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt,
      expiryDays: DEMO_APP_EXPIRY_DAYS,
    };

    // 保存到 KV (使用 demo_app: 前缀)
    await appsKV.put(DEMO_APP_KEY(id), demoApp);

    // 添加到索引列表
    await this.addToList(id);

    return demoApp;
  }

  /**
   * 获取体验应用列表
   * 从独立的索引列表读取
   */
  async list(): Promise<DemoApp[]> {
    const listData = await appsKV.get<string[]>(DEMO_APP_LIST_KEY);
    const appIds = listData || [];

    if (appIds.length === 0) {
      return [];
    }

    // 批量读取应用数据
    const apps = await Promise.all(
      appIds.map(async (id) => {
        const app = await appsKV.get<DemoApp>(DEMO_APP_KEY(id));
        return app;
      })
    );

    // 过滤掉不存在的应用（可能已被删除）
    return apps.filter((app): app is DemoApp => app !== null);
  }

  /**
   * 获取体验应用详情
   */
  async getById(id: string): Promise<DemoApp | null> {
    return await appsKV.get<DemoApp>(DEMO_APP_KEY(id));
  }

  /**
   * 根据 Key 获取体验应用
   */
  async getByKey(key: string): Promise<DemoApp | null> {
    const apps = await this.list();
    return apps.find(app => app.key === key) || null;
  }

  /**
   * 删除体验应用
   */
  async delete(id: string): Promise<void> {
    const app = await this.getById(id);
    if (!app) {
      throw ApiError.notFound('Demo app not found');
    }

    // 删除应用数据
    await appsKV.delete(DEMO_APP_KEY(id));

    // 从索引列表移除
    await this.removeFromList(id);

    // 删除关联的 OpenID
    const openIdKeys = await appsKV.listAll(KVKeys.OPENID_APP(id));
    for (const key of openIdKeys) {
      await appsKV.delete(key);
    }
  }

  /**
   * 清理过期的体验应用
   * 删除 expiresAt 已过期的应用
   * 
   * @returns 删除的应用数量
   */
  async cleanupExpired(): Promise<number> {
    const demoApps = await this.list();
    const now = Date.now();

    let deletedCount = 0;

    for (const app of demoApps) {
      const expiryTime = new Date(app.expiresAt).getTime();
      if (now > expiryTime) {
        try {
          await this.delete(app.id);
          deletedCount++;
        } catch (error) {
          console.error(`[DemoAppService] Failed to delete expired app ${app.id}:`, error);
        }
      }
    }

    return deletedCount;
  }

  /**
   * 添加应用ID到索引列表
   */
  private async addToList(id: string): Promise<void> {
    const listData = await appsKV.get<string[]>(DEMO_APP_LIST_KEY);
    const appIds = listData || [];
    
    if (!appIds.includes(id)) {
      appIds.push(id);
      await appsKV.put(DEMO_APP_LIST_KEY, appIds);
    }
  }

  /**
   * 从索引列表移除应用ID
   */
  private async removeFromList(id: string): Promise<void> {
    const listData = await appsKV.get<string[]>(DEMO_APP_LIST_KEY);
    const appIds = listData || [];
    
    const filtered = appIds.filter(appId => appId !== id);
    if (filtered.length !== appIds.length) {
      await appsKV.put(DEMO_APP_LIST_KEY, filtered);
    }
  }
}

export const demoAppService = new DemoAppService();
