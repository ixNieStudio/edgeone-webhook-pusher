/**
 * App Service - 应用管理
 * 管理消息推送应用，关联渠道和 OpenID
 */

import { appsKV, channelsKV, openidsKV } from '../shared/kv-client.js';
import { generateAppId, generateAppKey, now } from '../shared/utils.js';
import type { App, CreateAppInput, UpdateAppInput, Channel, OpenID } from '../types/index.js';
import { KVKeys, PushModes, MessageTypes, ApiError, ErrorCodes } from '../types/index.js';

class AppService {
  /**
   * 创建应用
   */
  async create(data: CreateAppInput): Promise<App> {
    const { name, channelId, pushMode, messageType = MessageTypes.NORMAL, templateId } = data;

    // 验证必填字段
    if (!name || !name.trim()) {
      throw ApiError.badRequest('App name is required');
    }
    if (!channelId) {
      throw ApiError.badRequest('channelId is required');
    }
    if (!pushMode) {
      throw ApiError.badRequest('pushMode is required');
    }
    if (!Object.values(PushModes).includes(pushMode)) {
      throw ApiError.badRequest(`pushMode must be one of: ${Object.values(PushModes).join(', ')}`);
    }
    if (!Object.values(MessageTypes).includes(messageType)) {
      throw ApiError.badRequest(`messageType must be one of: ${Object.values(MessageTypes).join(', ')}`);
    }

    // 验证 templateId（模板消息必填）
    if (messageType === MessageTypes.TEMPLATE && !templateId) {
      throw ApiError.badRequest('templateId is required when messageType is template');
    }

    // 验证渠道存在
    const channel = await channelsKV.get<Channel>(KVKeys.CHANNEL(channelId));
    if (!channel) {
      throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
    }

    const id = generateAppId();
    const key = generateAppKey();
    const timestamp = now();

    const app: App = {
      id,
      key,
      name: name.trim(),
      channelId,
      pushMode,
      messageType,
      ...(templateId && { templateId }),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 保存应用
    await appsKV.put(KVKeys.APP(id), app);

    // 创建 key 到 id 的索引
    await appsKV.put(KVKeys.APP_INDEX(key), id);

    // 更新应用列表
    const list = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    list.push(id);
    await appsKV.put(KVKeys.APP_LIST, list);

    return app;
  }

  /**
   * 根据 ID 获取应用
   */
  async getById(id: string): Promise<App | null> {
    return appsKV.get<App>(KVKeys.APP(id));
  }

  /**
   * 根据 Key 获取应用
   */
  async getByKey(key: string): Promise<App | null> {
    const id = await appsKV.get<string>(KVKeys.APP_INDEX(key));
    if (!id) return null;
    return this.getById(id);
  }

  /**
   * 获取所有应用列表
   */
  async list(): Promise<App[]> {
    const ids = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    const apps: App[] = [];

    for (const id of ids) {
      const app = await appsKV.get<App>(KVKeys.APP(id));
      if (app) {
        apps.push(app);
      }
    }

    return apps;
  }

  /**
   * 更新应用
   */
  async update(id: string, data: UpdateAppInput): Promise<App> {
    const app = await this.getById(id);
    if (!app) {
      throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
    }

    const { name, templateId } = data;

    if (name !== undefined) {
      if (!name.trim()) {
        throw ApiError.badRequest('App name cannot be empty');
      }
      app.name = name.trim();
    }

    if (templateId !== undefined) {
      app.templateId = templateId;
    }

    // 验证 templateId（模板消息必填）
    if (app.messageType === MessageTypes.TEMPLATE && !app.templateId) {
      throw ApiError.badRequest('templateId is required when messageType is template');
    }

    app.updatedAt = now();

    await appsKV.put(KVKeys.APP(id), app);
    return app;
  }

  /**
   * 删除应用（级联删除 OpenID）
   */
  async delete(id: string): Promise<void> {
    const app = await this.getById(id);
    if (!app) {
      throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
    }

    // 级联删除该应用下的所有 OpenID
    await this.deleteOpenIDs(id);

    // 删除 key 索引
    await appsKV.delete(KVKeys.APP_INDEX(app.key));

    // 删除应用
    await appsKV.delete(KVKeys.APP(id));

    // 更新应用列表
    const list = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    const newList = list.filter((aid) => aid !== id);
    await appsKV.put(KVKeys.APP_LIST, newList);
  }

  /**
   * 删除应用下的所有 OpenID
   */
  async deleteOpenIDs(appId: string): Promise<void> {
    const openIdList = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(appId))) || [];

    for (const oidId of openIdList) {
      const openIdRecord = await openidsKV.get<OpenID>(KVKeys.OPENID(oidId));
      if (openIdRecord) {
        // 删除唯一性索引
        await openidsKV.delete(KVKeys.OPENID_INDEX(appId, openIdRecord.openId));
        // 删除 OpenID 记录
        await openidsKV.delete(KVKeys.OPENID(oidId));
      }
    }

    // 删除应用的 OpenID 列表
    await openidsKV.delete(KVKeys.OPENID_APP(appId));
  }

  /**
   * 获取应用下的 OpenID 数量
   */
  async getOpenIDCount(id: string): Promise<number> {
    const openIdList = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(id))) || [];
    return openIdList.length;
  }
}

export const appService = new AppService();
