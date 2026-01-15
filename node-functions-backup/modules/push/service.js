/**
 * Push Service - 消息推送核心逻辑
 * Module: push
 * 
 * 基于 App 配置处理推送逻辑：
 * - single 模式：发送给第一个绑定的 OpenID
 * - subscribe 模式：发送给所有绑定的 OpenID
 * - normal 消息类型：发送客服消息
 * - template 消息类型：发送模板消息
 */

import { appService } from '../app/service.js';
import { openidService } from '../openid/service.js';
import { channelService } from '../channel/service.js';
import { historyService } from '../history/service.js';
import { generatePushId, now } from '../../shared/utils.js';
import { PushModes, MessageTypes, KVKeys } from '../../shared/types.js';
import { channelsKV } from '../../shared/kv-client.js';

class PushService {
  /**
   * 通过 App Key 发送消息
   * @param {string} appKey - App Key (APK...)
   * @param {Object} message - 消息内容
   * @param {string} message.title - 消息标题
   * @param {string} [message.desp] - 消息内容
   * @param {Object} [message.data] - 模板消息数据
   * @returns {Promise<import('../../shared/types.js').PushResult>}
   */
  async push(appKey, message) {
    const pushId = generatePushId();
    const createdAt = now();

    // 查找 App
    const app = await appService.getByKey(appKey);
    if (!app) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
        error: 'App not found',
      };
    }

    // 获取 App 下的 OpenID 列表
    const openIds = await openidService.listByApp(app.id);
    if (openIds.length === 0) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
        error: 'No OpenIDs bound to this app',
      };
    }

    // 获取渠道配置
    const channel = await channelService.getById(app.channelId);
    if (!channel) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
        error: 'Channel not found',
      };
    }

    // 根据推送模式确定目标 OpenID
    let targetOpenIds;
    if (app.pushMode === PushModes.SINGLE) {
      // 单发模式：只发送给第一个 OpenID
      targetOpenIds = [openIds[0]];
    } else {
      // 订阅模式：发送给所有 OpenID
      targetOpenIds = openIds;
    }

    // 获取 Access Token
    const accessToken = await this.getAccessToken(channel);
    if (!accessToken) {
      return {
        pushId,
        total: targetOpenIds.length,
        success: 0,
        failed: targetOpenIds.length,
        results: targetOpenIds.map((oid) => ({
          openId: oid.openId,
          success: false,
          error: 'Failed to get access token',
        })),
        error: 'Failed to get access token',
      };
    }

    // 发送消息
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const openIdRecord of targetOpenIds) {
      try {
        let result;
        if (app.messageType === MessageTypes.TEMPLATE) {
          result = await this.sendTemplateMessage(
            accessToken,
            openIdRecord.openId,
            app.templateId,
            message
          );
        } else {
          result = await this.sendTextMessage(
            accessToken,
            openIdRecord.openId,
            message
          );
        }

        results.push({
          openId: openIdRecord.openId,
          success: result.success,
          msgId: result.msgId,
          error: result.error,
        });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        results.push({
          openId: openIdRecord.openId,
          success: false,
          error: error.message || 'Unknown error',
        });
        failedCount++;
      }
    }

    // 保存消息历史
    await historyService.saveMessage({
      id: pushId,
      appId: app.id,
      title: message.title,
      desp: message.desp,
      results,
      createdAt,
    });

    return {
      pushId,
      total: targetOpenIds.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * 获取微信 Access Token（带缓存）
   * @param {import('../../shared/types.js').Channel} channel
   * @returns {Promise<string | null>}
   */
  async getAccessToken(channel) {
    const cacheKey = KVKeys.WECHAT_TOKEN(channel.config.appId);
    
    // 尝试从缓存获取
    const cached = await channelsKV.get(cacheKey);
    if (cached?.accessToken && cached?.expiresAt > Date.now()) {
      return cached.accessToken;
    }

    // 请求新的 Access Token
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${channel.config.appId}&secret=${channel.config.appSecret}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.errcode) {
        console.error('Failed to get access token:', data);
        return null;
      }

      const tokenData = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 5 分钟缓冲
      };

      // 缓存到 KV（TTL 略小于 2 小时）
      await channelsKV.put(cacheKey, tokenData, 7000);

      return data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error);
      return null;
    }
  }

  /**
   * 发送模板消息
   * @param {string} accessToken
   * @param {string} openId
   * @param {string} templateId
   * @param {Object} message
   * @returns {Promise<{ success: boolean, msgId?: string, error?: string }>}
   */
  async sendTemplateMessage(accessToken, openId, templateId, message) {
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
      
      // 构建模板消息数据
      const templateData = {
        first: { value: message.title || '' },
        keyword1: { value: message.desp || '' },
        remark: { value: '' },
        ...(message.data || {}),
      };

      const body = {
        touser: openId,
        template_id: templateId,
        data: templateData,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.errcode === 0) {
        return { success: true, msgId: String(data.msgid) };
      } else {
        return { success: false, error: `WeChat API error: ${data.errcode} - ${data.errmsg}` };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * 发送客服文本消息
   * @param {string} accessToken
   * @param {string} openId
   * @param {Object} message
   * @returns {Promise<{ success: boolean, msgId?: string, error?: string }>}
   */
  async sendTextMessage(accessToken, openId, message) {
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`;
      
      // 构建文本内容
      const content = message.desp 
        ? `${message.title}\n\n${message.desp}`
        : message.title;

      const body = {
        touser: openId,
        msgtype: 'text',
        text: { content },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.errcode === 0) {
        return { success: true, msgId: String(data.msgid || '') };
      } else {
        return { success: false, error: `WeChat API error: ${data.errcode} - ${data.errmsg}` };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
}

export const pushService = new PushService();
