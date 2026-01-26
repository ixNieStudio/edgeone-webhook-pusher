/**
 * App Service - 应用管理
 * 管理消息推送应用，关联渠道和 OpenID
 */

import { appsKV, channelsKV, openidsKV } from '../shared/kv-client.js';
import { generateAppId, generateAppKey, now } from '../shared/utils.js';
import type { App, CreateAppInput, UpdateAppInput, Channel, OpenID, WeChatAppConfig, WorkWeChatAppConfig, WebhookAppConfig } from '../types/index.js';
import { KVKeys, PushModes, MessageTypes, ApiError, ErrorCodes } from '../types/index.js';

class AppService {
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
        // Webhook 渠道：需要 webhookUrl
        if (!data.webhookUrl) {
          throw ApiError.badRequest(`webhookUrl is required for ${channelType} channel`);
        }
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
          webhookUrl: data.webhookUrl!,
          ...(data.atMobiles && { atMobiles: data.atMobiles }),
          ...(data.atAll !== undefined && { atAll: data.atAll }),
        };
      }
      
      case 'feishu': {
        return {
          ...baseConfig,
          channelType: 'feishu',
          webhookUrl: data.webhookUrl!,
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
        
        // 更新 webhookUrl
        if (data.webhookUrl !== undefined) {
          if (!data.webhookUrl) {
            throw ApiError.badRequest('webhookUrl cannot be empty for DingTalk channel');
          }
          dingtalkApp.webhookUrl = data.webhookUrl;
        }
        
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
        const feishuApp = app as WebhookAppConfig;
        
        // 更新 webhookUrl
        if (data.webhookUrl !== undefined) {
          if (!data.webhookUrl) {
            throw ApiError.badRequest('webhookUrl cannot be empty for Feishu channel');
          }
          feishuApp.webhookUrl = data.webhookUrl;
        }
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
