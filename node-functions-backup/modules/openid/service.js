/**
 * OpenID Service - 管理应用下的微信用户 OpenID 记录
 * Module: openid
 * 
 * OpenID 归属于 App，在应用维度管理用户绑定
 */

import { openidsKV, appsKV } from '../../shared/kv-client.js';
import { generateOpenIdRecordId, now } from '../../shared/utils.js';
import { KVKeys } from '../../shared/types.js';

/**
 * OpenIdService - 管理 OpenID（微信用户）记录
 */
class OpenIdService {
  /**
   * 在指定应用下创建 OpenID 记录
   * @param {string} appId - 应用 ID
   * @param {Object} data - OpenID 数据
   * @param {string} data.openId - 微信 OpenID
   * @param {string} [data.nickname] - 用户昵称
   * @param {string} [data.remark] - 备注
   * @returns {Promise<import('../../shared/types.js').OpenID>}
   */
  async create(appId, data) {
    const { openId, nickname, remark } = data;

    // 验证必填字段
    if (!openId || !openId.trim()) {
      throw new Error('openId is required');
    }

    const trimmedOpenId = openId.trim();

    // 验证应用存在
    const app = await appsKV.get(KVKeys.APP(appId));
    if (!app) {
      throw new Error('App not found');
    }

    // 检查同一应用下是否已存在该 OpenID
    const exists = await this.existsInApp(appId, trimmedOpenId);
    if (exists) {
      throw new Error('OpenID already exists in this app');
    }

    const id = generateOpenIdRecordId();
    const timestamp = now();

    const record = {
      id,
      appId,
      openId: trimmedOpenId,
      ...(nickname && { nickname: nickname.trim() }),
      ...(remark && { remark: remark.trim() }),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 保存 OpenID 记录
    await openidsKV.put(KVKeys.OPENID(id), record);

    // 创建唯一性索引
    await openidsKV.put(KVKeys.OPENID_INDEX(appId, openId), id);

    // 更新应用的 OpenID 列表
    const list = (await openidsKV.get(KVKeys.OPENID_APP(appId))) || [];
    list.push(id);
    await openidsKV.put(KVKeys.OPENID_APP(appId), list);

    return record;
  }

  /**
   * 根据 ID 获取 OpenID 记录
   * @param {string} id - OpenID 记录 ID
   * @returns {Promise<import('../../shared/types.js').OpenID | null>}
   */
  async getById(id) {
    return openidsKV.get(KVKeys.OPENID(id));
  }

  /**
   * 获取指定应用下的所有 OpenID 列表
   * @param {string} appId - 应用 ID
   * @returns {Promise<import('../../shared/types.js').OpenID[]>}
   */
  async listByApp(appId) {
    const ids = (await openidsKV.get(KVKeys.OPENID_APP(appId))) || [];
    const records = [];

    for (const id of ids) {
      const record = await openidsKV.get(KVKeys.OPENID(id));
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * 更新 OpenID 记录
   * @param {string} id - OpenID 记录 ID
   * @param {Object} data - 更新数据
   * @param {string} [data.nickname] - 用户昵称
   * @param {string} [data.remark] - 备注
   * @returns {Promise<import('../../shared/types.js').OpenID>}
   */
  async update(id, data) {
    const record = await this.getById(id);
    if (!record) {
      throw new Error('OpenID not found');
    }

    const { nickname, remark } = data;

    if (nickname !== undefined) {
      record.nickname = nickname ? nickname.trim() : undefined;
    }

    if (remark !== undefined) {
      record.remark = remark ? remark.trim() : undefined;
    }

    record.updatedAt = now();

    await openidsKV.put(KVKeys.OPENID(id), record);
    return record;
  }

  /**
   * 删除 OpenID 记录
   * @param {string} id - OpenID 记录 ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    const record = await this.getById(id);
    if (!record) {
      throw new Error('OpenID not found');
    }

    const { appId, openId } = record;

    // 删除唯一性索引
    await openidsKV.delete(KVKeys.OPENID_INDEX(appId, openId));

    // 删除 OpenID 记录
    await openidsKV.delete(KVKeys.OPENID(id));

    // 更新应用的 OpenID 列表
    const list = (await openidsKV.get(KVKeys.OPENID_APP(appId))) || [];
    const newList = list.filter((oid) => oid !== id);
    await openidsKV.put(KVKeys.OPENID_APP(appId), newList);
  }

  /**
   * 删除指定应用下的所有 OpenID
   * @param {string} appId - 应用 ID
   * @returns {Promise<void>}
   */
  async deleteByApp(appId) {
    const ids = (await openidsKV.get(KVKeys.OPENID_APP(appId))) || [];

    for (const id of ids) {
      const record = await openidsKV.get(KVKeys.OPENID(id));
      if (record) {
        // 删除唯一性索引
        await openidsKV.delete(KVKeys.OPENID_INDEX(appId, record.openId));
        // 删除 OpenID 记录
        await openidsKV.delete(KVKeys.OPENID(id));
      }
    }

    // 删除应用的 OpenID 列表
    await openidsKV.delete(KVKeys.OPENID_APP(appId));
  }

  /**
   * 检查同一应用下是否已存在该 OpenID
   * @param {string} appId - 应用 ID
   * @param {string} openId - 微信 OpenID
   * @returns {Promise<boolean>}
   */
  async existsInApp(appId, openId) {
    const id = await openidsKV.get(KVKeys.OPENID_INDEX(appId, openId));
    return id !== null;
  }

  /**
   * 根据应用 ID 和 OpenID 值查找记录
   * @param {string} appId - 应用 ID
   * @param {string} openId - 微信 OpenID
   * @returns {Promise<import('../../shared/types.js').OpenID | null>}
   */
  async findByOpenId(appId, openId) {
    const id = await openidsKV.get(KVKeys.OPENID_INDEX(appId, openId));
    if (!id) return null;
    return this.getById(id);
  }

  /**
   * 批量获取 OpenID 记录
   * @param {string[]} ids - OpenID 记录 ID 数组
   * @returns {Promise<import('../../shared/types.js').OpenID[]>}
   */
  async getMany(ids) {
    const records = [];
    for (const id of ids) {
      const record = await this.getById(id);
      if (record) {
        records.push(record);
      }
    }
    return records;
  }
}

export const openidService = new OpenIdService();
