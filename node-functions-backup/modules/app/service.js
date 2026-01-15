/**
 * App Service - 应用管理
 * 管理消息推送应用，关联渠道和 OpenID
 */

import { appsKV, channelsKV, openidsKV } from '../../shared/kv-client.js';
import { generateAppId, generateAppKey, now } from '../../shared/utils.js';
import { KVKeys, PushModes, MessageTypes } from '../../shared/types.js';

class AppService {
  /**
   * 创建应用
   * @param {Object} data - 应用数据
   * @param {string} data.name - 应用名称
   * @param {string} data.channelId - 关联的渠道 ID
   * @param {'single'|'subscribe'} data.pushMode - 推送模式
   * @param {'normal'|'template'} [data.messageType] - 消息类型
   * @param {string} [data.templateId] - 模板 ID（messageType=template 时必填）
   * @returns {Promise<import('../../shared/types.js').App>}
   */
  async create(data) {
    const { name, channelId, pushMode, messageType = MessageTypes.NORMAL, templateId } = data;

    // 验证必填字段
    if (!name || !name.trim()) {
      throw new Error('App name is required');
    }
    if (!channelId) {
      throw new Error('channelId is required');
    }
    if (!pushMode) {
      throw new Error('pushMode is required');
    }
    if (!Object.values(PushModes).includes(pushMode)) {
      throw new Error(`pushMode must be one of: ${Object.values(PushModes).join(', ')}`);
    }
    if (!Object.values(MessageTypes).includes(messageType)) {
      throw new Error(`messageType must be one of: ${Object.values(MessageTypes).join(', ')}`);
    }

    // 验证 templateId（模板消息必填）
    if (messageType === MessageTypes.TEMPLATE && !templateId) {
      throw new Error('templateId is required when messageType is template');
    }

    // 验证渠道存在
    const channel = await channelsKV.get(KVKeys.CHANNEL(channelId));
    if (!channel) {
      throw new Error('Channel not found');
    }

    const id = generateAppId();
    const key = generateAppKey();
    const timestamp = now();

    const app = {
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
    const list = (await appsKV.get(KVKeys.APP_LIST)) || [];
    list.push(id);
    await appsKV.put(KVKeys.APP_LIST, list);

    return app;
  }

  /**
   * 根据 ID 获取应用
   * @param {string} id - 应用 ID
   * @returns {Promise<import('../../shared/types.js').App | null>}
   */
  async getById(id) {
    return appsKV.get(KVKeys.APP(id));
  }

  /**
   * 根据 Key 获取应用
   * @param {string} key - 应用 Key
   * @returns {Promise<import('../../shared/types.js').App | null>}
   */
  async getByKey(key) {
    const id = await appsKV.get(KVKeys.APP_INDEX(key));
    if (!id) return null;
    return this.getById(id);
  }

  /**
   * 获取所有应用列表
   * @returns {Promise<import('../../shared/types.js').App[]>}
   */
  async list() {
    const ids = (await appsKV.get(KVKeys.APP_LIST)) || [];
    const apps = [];

    for (const id of ids) {
      const app = await appsKV.get(KVKeys.APP(id));
      if (app) {
        apps.push(app);
      }
    }

    return apps;
  }

  /**
   * 更新应用
   * @param {string} id - 应用 ID
   * @param {Object} data - 更新数据
   * @returns {Promise<import('../../shared/types.js').App>}
   */
  async update(id, data) {
    const app = await this.getById(id);
    if (!app) {
      throw new Error('App not found');
    }

    const { name, templateId, pushMode, messageType } = data;

    if (name !== undefined) {
      if (!name.trim()) {
        throw new Error('App name cannot be empty');
      }
      app.name = name.trim();
    }

    if (pushMode !== undefined) {
      if (!Object.values(PushModes).includes(pushMode)) {
        throw new Error(`pushMode must be one of: ${Object.values(PushModes).join(', ')}`);
      }
      app.pushMode = pushMode;
    }

    if (messageType !== undefined) {
      if (!Object.values(MessageTypes).includes(messageType)) {
        throw new Error(`messageType must be one of: ${Object.values(MessageTypes).join(', ')}`);
      }
      app.messageType = messageType;
    }

    if (templateId !== undefined) {
      app.templateId = templateId;
    }

    // 验证 templateId（模板消息必填）
    if (app.messageType === MessageTypes.TEMPLATE && !app.templateId) {
      throw new Error('templateId is required when messageType is template');
    }

    app.updatedAt = now();

    await appsKV.put(KVKeys.APP(id), app);
    return app;
  }

  /**
   * 删除应用（级联删除 OpenID）
   * @param {string} id - 应用 ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    const app = await this.getById(id);
    if (!app) {
      throw new Error('App not found');
    }

    // 级联删除该应用下的所有 OpenID
    await this.deleteOpenIDs(id);

    // 删除 key 索引
    await appsKV.delete(KVKeys.APP_INDEX(app.key));

    // 删除应用
    await appsKV.delete(KVKeys.APP(id));

    // 更新应用列表
    const list = (await appsKV.get(KVKeys.APP_LIST)) || [];
    const newList = list.filter((aid) => aid !== id);
    await appsKV.put(KVKeys.APP_LIST, newList);
  }

  /**
   * 删除应用下的所有 OpenID
   * @param {string} appId - 应用 ID
   * @returns {Promise<void>}
   */
  async deleteOpenIDs(appId) {
    const openIdList = (await openidsKV.get(KVKeys.OPENID_APP(appId))) || [];

    for (const oidId of openIdList) {
      const openIdRecord = await openidsKV.get(KVKeys.OPENID(oidId));
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
   * @param {string} id - 应用 ID
   * @returns {Promise<number>}
   */
  async getOpenIDCount(id) {
    const openIdList = (await openidsKV.get(KVKeys.OPENID_APP(id))) || [];
    return openIdList.length;
  }
}

export const appService = new AppService();
