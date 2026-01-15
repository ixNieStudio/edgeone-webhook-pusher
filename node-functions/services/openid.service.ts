/**
 * OpenID Service - 管理应用下的微信用户 OpenID 记录
 * 
 * OpenID 归属于 App，在应用维度管理用户绑定
 */

import { openidsKV, appsKV } from '../shared/kv-client.js';
import { generateOpenIdRecordId, now } from '../shared/utils.js';
import type { OpenID, CreateOpenIDInput, UpdateOpenIDInput, App } from '../types/index.js';
import { KVKeys, ApiError, ErrorCodes } from '../types/index.js';

class OpenIdService {
  /**
   * 在指定应用下创建 OpenID 记录
   */
  async create(appId: string, data: CreateOpenIDInput): Promise<OpenID> {
    const { openId, nickname, remark } = data;

    // 验证必填字段
    if (!openId || !openId.trim()) {
      throw ApiError.badRequest('openId is required');
    }

    const trimmedOpenId = openId.trim();

    // 验证应用存在
    const app = await appsKV.get<App>(KVKeys.APP(appId));
    if (!app) {
      throw ApiError.notFound('App not found', ErrorCodes.APP_NOT_FOUND);
    }

    // 检查同一应用下是否已存在该 OpenID
    const exists = await this.existsInApp(appId, trimmedOpenId);
    if (exists) {
      throw ApiError.badRequest('OpenID already exists in this app', ErrorCodes.ALREADY_SUBSCRIBED);
    }

    const id = generateOpenIdRecordId();
    const timestamp = now();

    const record: OpenID = {
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
    await openidsKV.put(KVKeys.OPENID_INDEX(appId, trimmedOpenId), id);

    // 更新应用的 OpenID 列表
    const list = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(appId))) || [];
    list.push(id);
    await openidsKV.put(KVKeys.OPENID_APP(appId), list);

    return record;
  }

  /**
   * 根据 ID 获取 OpenID 记录
   */
  async getById(id: string): Promise<OpenID | null> {
    return openidsKV.get<OpenID>(KVKeys.OPENID(id));
  }

  /**
   * 获取指定应用下的所有 OpenID 列表
   */
  async listByApp(appId: string): Promise<OpenID[]> {
    const ids = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(appId))) || [];
    const records: OpenID[] = [];

    for (const id of ids) {
      const record = await openidsKV.get<OpenID>(KVKeys.OPENID(id));
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * 更新 OpenID 记录
   */
  async update(id: string, data: UpdateOpenIDInput): Promise<OpenID> {
    const record = await this.getById(id);
    if (!record) {
      throw ApiError.notFound('OpenID not found', ErrorCodes.OPENID_NOT_FOUND);
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
   */
  async delete(id: string): Promise<void> {
    const record = await this.getById(id);
    if (!record) {
      throw ApiError.notFound('OpenID not found', ErrorCodes.OPENID_NOT_FOUND);
    }

    const { appId, openId } = record;

    // 删除唯一性索引
    await openidsKV.delete(KVKeys.OPENID_INDEX(appId, openId));

    // 删除 OpenID 记录
    await openidsKV.delete(KVKeys.OPENID(id));

    // 更新应用的 OpenID 列表
    const list = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(appId))) || [];
    const newList = list.filter((oid) => oid !== id);
    await openidsKV.put(KVKeys.OPENID_APP(appId), newList);
  }

  /**
   * 删除指定应用下的所有 OpenID
   */
  async deleteByApp(appId: string): Promise<void> {
    const ids = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(appId))) || [];

    for (const id of ids) {
      const record = await openidsKV.get<OpenID>(KVKeys.OPENID(id));
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
   */
  async existsInApp(appId: string, openId: string): Promise<boolean> {
    const id = await openidsKV.get<string>(KVKeys.OPENID_INDEX(appId, openId));
    return id !== null;
  }

  /**
   * 根据应用 ID 和 OpenID 值查找记录
   */
  async findByOpenId(appId: string, openId: string): Promise<OpenID | null> {
    const id = await openidsKV.get<string>(KVKeys.OPENID_INDEX(appId, openId));
    if (!id) return null;
    return this.getById(id);
  }

  /**
   * 批量获取 OpenID 记录
   */
  async getMany(ids: string[]): Promise<OpenID[]> {
    const records: OpenID[] = [];
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
