/**
 * App Service - 应用管理
 * 管理消息推送应用，关联渠道和 OpenID
 */

import { appsKV, channelsKV, openidsKV } from '../shared/kv-client.js';
import { generateAppId, generateAppKey, now } from '../shared/utils.js';
import type { App, CreateAppInput, UpdateAppInput, Channel, OpenID, WeChatAppConfig, WorkWeChatAppConfig, WebhookAppConfig } from '../types/index.js';
import { KVKeys, PushModes, MessageTypes, ApiError, ErrorCodes } from '../types/index.js';
import { adminIndexService } from './admin-index.service.js';

class AppService {
  private async syncSendProfileByApp(app: App): Promise<void> {
    try {
      const { sendProfileService } = await import('./send-profile.service.js');
      await sendProfileService.syncByApp(app);
    } catch {
      // send profile 缺失时可在发送链路自愈，这里不阻断主写流程
    }
  }

  private async removeSendProfileByKey(appKey: string): Promise<void> {
    await appsKV.delete(KVKeys.APP_SEND_PROFILE(appKey));
  }

  private async ensureAppIndexes(apps: App[]): Promise<void> {
    await Promise.all(
      apps.map(async (app) => {
        const indexedId = await appsKV.get<string>(KVKeys.APP_INDEX(app.key));
        if (indexedId !== app.id) {
          await appsKV.put(KVKeys.APP_INDEX(app.key), app.id);
        }
      })
    );
  }

  private async loadAppsByIds(ids: string[]): Promise<App[]> {
    if (ids.length === 0) {
      return [];
    }

    const appMap = await appsKV.getMany<App>(ids.map((id) => KVKeys.APP(id)));
    return ids
      .map((id) => appMap[KVKeys.APP(id)] ?? null)
      .filter((app): app is App => app !== null);
  }

  /**
   * 创建应用
   */
  async create(data: CreateAppInput): Promise<App> {
    const { name, channelId } = data;

    // 验证必填字段
    if (!name || !name.trim()) {
      throw ApiError.badRequest('App name is required');
    }
    if (!channelId) {
      throw ApiError.badRequest('channelId is required');
    }

    // 验证渠道存在
    const channel = await channelsKV.get<Channel>(KVKeys.CHANNEL(channelId));
    if (!channel) {
      throw ApiError.notFound('Channel not found', ErrorCodes.CHANNEL_NOT_FOUND);
    }

    // 根据渠道类型验证配置字段
    this.validateAppConfig(channel.type, data);

    const id = generateAppId();
    const key = await this.generateUniqueAppKey();
    const timestamp = now();

    // 根据渠道类型创建对应的应用配置
    const app = this.buildAppConfig(id, key, name.trim(), channelId, channel.type, data, timestamp);

    // 保存应用
    const list = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    list.push(id);
    await appsKV.putMany<unknown>([
      { key: KVKeys.APP(id), value: app },
      { key: KVKeys.APP_INDEX(key), value: id },
      { key: KVKeys.APP_LIST, value: list },
    ]);

    await this.syncSendProfileByApp(app);

    return app;
  }

  /**
   * 验证应用配置字段（根据渠道类型）
   */
  private validateAppConfig(channelType: string, data: CreateAppInput): void {
    switch (channelType) {
      case 'wechat': {
        // 微信渠道：需要 pushMode 和 messageType
        if (!data.pushMode) {
          throw ApiError.badRequest('pushMode is required for WeChat channel');
        }
        if (!Object.values(PushModes).includes(data.pushMode)) {
          throw ApiError.badRequest(`pushMode must be one of: ${Object.values(PushModes).join(', ')}`);
        }
        
        const messageType = data.messageType || MessageTypes.NORMAL;
        if (!Object.values(MessageTypes).includes(messageType)) {
          throw ApiError.badRequest(`messageType must be one of: ${Object.values(MessageTypes).join(', ')}`);
        }
        
        // 验证 templateId（模板消息必填）
        if (messageType === MessageTypes.TEMPLATE && !data.templateId) {
          throw ApiError.badRequest('templateId is required when messageType is template');
        }
        break;
      }
      
      case 'work_wechat': {
        // 企业微信渠道：需要 userIds 或 departmentIds（至少一个）
        if (!data.userIds?.length && !data.departmentIds?.length) {
          throw ApiError.badRequest('At least one of userIds or departmentIds is required for WorkWeChat channel');
        }
        
        // 验证 messageType
        const messageType = data.messageType || 'text';
        if (!['text', 'template_card'].includes(messageType)) {
          throw ApiError.badRequest('messageType must be one of: text, template_card');
        }
        break;
      }
      
      case 'dingtalk':
      case 'feishu': {
        // Webhook 渠道：不需要额外验证，使用渠道的 webhookUrl
        // 可选字段：atMobiles, atAll（钉钉专用）
        break;
      }
      
      default:
        throw ApiError.badRequest(`Unsupported channel type: ${channelType}`);
    }
  }

  /**
   * 根据渠道类型构建应用配置
   */
  private buildAppConfig(
    id: string,
    key: string,
    name: string,
    channelId: string,
    channelType: string,
    data: CreateAppInput,
    timestamp: string
  ): App {
    const baseConfig = {
      id,
      key,
      name,
      channelId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    switch (channelType) {
      case 'wechat': {
        return {
          ...baseConfig,
          channelType: 'wechat',
          pushMode: data.pushMode!,
          messageType: data.messageType || MessageTypes.NORMAL,
          ...(data.templateId && { templateId: data.templateId }),
        };
      }
      
      case 'work_wechat': {
        return {
          ...baseConfig,
          channelType: 'work_wechat',
          messageType: (data.messageType as 'text' | 'template_card') || 'text',
          ...(data.userIds && { userIds: data.userIds }),
          ...(data.departmentIds && { departmentIds: data.departmentIds }),
        };
      }
      
      case 'dingtalk': {
        return {
          ...baseConfig,
          channelType: 'dingtalk',
          ...(data.atMobiles && { atMobiles: data.atMobiles }),
          ...(data.atAll !== undefined && { atAll: data.atAll }),
        };
      }
      
      case 'feishu': {
        return {
          ...baseConfig,
          channelType: 'feishu',
        };
      }
      
      default:
        throw ApiError.badRequest(`Unsupported channel type: ${channelType}`);
    }
  }

  /**
   * 生成唯一的应用密钥
   */
  private async generateUniqueAppKey(): Promise<string> {
    let key: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      key = generateAppKey();
      const existingId = await appsKV.get<string>(KVKeys.APP_INDEX(key));
      
      if (!existingId) {
        return key;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw ApiError.internal('Failed to generate unique app key after multiple attempts');
      }
    } while (true);
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
    if (id) {
      return this.getById(id);
    }

    const indexedIds = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    let apps = await this.loadAppsByIds(indexedIds);

    if (indexedIds.length === 0 || apps.length !== indexedIds.length) {
      await adminIndexService.repair('apps', 'auto');
      const repairedIds = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
      apps = await this.loadAppsByIds(repairedIds);
    }

    const app = apps.find((item) => item.key === key) || null;
    if (app) {
      await appsKV.put(KVKeys.APP_INDEX(key), app.id);
    }
    return app;
  }

  /**
   * 获取所有应用列表
   */
  async list(): Promise<App[]> {
    const indexedIds = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    const indexedApps = await this.loadAppsByIds(indexedIds);

    if (indexedIds.length > 0 && indexedApps.length === indexedIds.length) {
      await this.ensureAppIndexes(indexedApps);
      return indexedApps;
    }

    await adminIndexService.repair('apps', 'auto');
    const repairedIds = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    const validApps = await this.loadAppsByIds(repairedIds);
    await this.ensureAppIndexes(validApps);
    return validApps;
  }

  /**
   * 获取指定渠道下的所有应用
   */
  async listByChannel(channelId: string): Promise<App[]> {
    const allApps = await this.list();
    return allApps.filter(app => app.channelId === channelId);
  }

  /**
   * 更新应用
   */
  async update(id: string, data: UpdateAppInput): Promise<App> {
    const app = await this.getById(id);
    if (!app) {
      throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
    }

    const { name } = data;

    // 更新名称
    if (name !== undefined) {
      if (!name.trim()) {
        throw ApiError.badRequest('App name cannot be empty');
      }
      app.name = name.trim();
    }

    // 根据渠道类型更新配置字段
    this.updateAppConfigFields(app, data);

    app.updatedAt = now();

    await appsKV.put(KVKeys.APP(id), app);
    await this.removeSendProfileByKey(app.key);
    await this.syncSendProfileByApp(app);
    return app;
  }

  /**
   * 根据渠道类型更新应用配置字段
   */
  private updateAppConfigFields(app: App, data: UpdateAppInput): void {
    switch (app.channelType) {
      case 'wechat': {
        const wechatApp = app as WeChatAppConfig;
        
        // 更新 templateId
        if (data.templateId !== undefined) {
          wechatApp.templateId = data.templateId;
        }
        
        // 验证 templateId（模板消息必填）
        if (wechatApp.messageType === MessageTypes.TEMPLATE && !wechatApp.templateId) {
          throw ApiError.badRequest('templateId is required when messageType is template');
        }
        break;
      }
      
      case 'work_wechat': {
        const workWechatApp = app as WorkWeChatAppConfig;
        
        // 更新 userIds
        if (data.userIds !== undefined) {
          if (data.userIds.length > 0) {
            workWechatApp.userIds = data.userIds;
          } else {
            delete workWechatApp.userIds;
          }
        }
        
        // 更新 departmentIds
        if (data.departmentIds !== undefined) {
          if (data.departmentIds.length > 0) {
            workWechatApp.departmentIds = data.departmentIds;
          } else {
            delete workWechatApp.departmentIds;
          }
        }
        
        // 验证至少有一个目标
        if (!workWechatApp.userIds?.length && !workWechatApp.departmentIds?.length) {
          throw ApiError.badRequest('At least one of userIds or departmentIds is required for WorkWeChat channel');
        }
        break;
      }
      
      case 'dingtalk': {
        const dingtalkApp = app as WebhookAppConfig;
        
        // 更新 atMobiles
        if (data.atMobiles !== undefined) {
          dingtalkApp.atMobiles = data.atMobiles;
        }
        
        // 更新 atAll
        if (data.atAll !== undefined) {
          dingtalkApp.atAll = data.atAll;
        }
        break;
      }
      
      case 'feishu': {
        // 飞书应用没有额外的可更新字段
        break;
      }
    }
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
    await Promise.all([
      appsKV.delete(KVKeys.APP_INDEX(app.key)),
      this.removeSendProfileByKey(app.key),
    ]);
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

    // 并行获取所有 OpenID 记录
    const openIdPromises = openIdList.map(oidId => openidsKV.get<OpenID>(KVKeys.OPENID(oidId)));
    const openIdRecords = await Promise.all(openIdPromises);

    // 并行删除所有索引和记录
    const deletePromises: Promise<void>[] = [];

    openIdRecords.forEach((openIdRecord, index) => {
      if (openIdRecord) {
        // 删除唯一性索引
        deletePromises.push(openidsKV.delete(KVKeys.OPENID_INDEX(appId, openIdRecord.openId)));
        // 删除 OpenID 记录
        deletePromises.push(openidsKV.delete(KVKeys.OPENID(openIdList[index])));
      }
    });

    await Promise.all(deletePromises);

    // 删除应用的 OpenID 列表
    await Promise.all([
      openidsKV.delete(KVKeys.OPENID_APP(appId)),
      openidsKV.delete(KVKeys.OPENID_VALUES(appId)),
    ]);
  }

  /**
   * 获取应用下的 OpenID 数量
   */
  async getOpenIDCount(id: string): Promise<number> {
    const values = await openidsKV.get<string[]>(KVKeys.OPENID_VALUES(id));
    if (values) {
      return values.length;
    }

    const openIdList = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(id))) || [];
    return openIdList.length;
  }
}

export const appService = new AppService();
