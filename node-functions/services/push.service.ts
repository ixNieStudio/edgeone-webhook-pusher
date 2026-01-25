/**
 * Push Service - 消息推送核心逻辑
 * 
 * 基于 App 配置处理推送逻辑：
 * - single 模式：发送给第一个绑定的 OpenID
 * - subscribe 模式：发送给所有绑定的 OpenID
 * - normal 消息类型：发送客服消息
 * - template 消息类型：发送模板消息
 */

import { appService } from './app.service.js';
import { openidService } from './openid.service.js';
import { channelService } from './channel.service.js';
import { messageService } from './message.service.js';
import { wechatService } from './wechat.service.js';
import { generatePushId, now } from '../shared/utils.js';
import { isWeChatApp } from '../shared/type-guards.js';
import type { PushResult, PushMessageInput, DeliveryResult, Message } from '../types/index.js';
import { PushModes, MessageTypes } from '../types/index.js';

class PushService {
  /**
   * 通过 App Key 发送消息
   */
  async push(appKey: string, message: PushMessageInput): Promise<PushResult> {
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
      };
    }

    // 根据推送模式确定目标 OpenID
    let targetOpenIds = openIds;
    
    // 使用类型守卫检查应用类型
    if (isWeChatApp(app)) {
      if (app.pushMode === PushModes.SINGLE) {
        // 单发模式：只发送给第一个 OpenID
        targetOpenIds = [openIds[0]];
      }
    }

    // 发送消息
    const results: DeliveryResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const openIdRecord of targetOpenIds) {
      try {
        let result: { success: boolean; msgId?: string; error?: string };
        
        // 使用类型守卫安全地访问微信应用配置
        if (isWeChatApp(app) && app.messageType === MessageTypes.TEMPLATE && app.templateId) {
          // 发送模板消息
          const templateData = {
            first: { value: message.title || '' },
            keyword1: { value: message.desp || '' },
            remark: { value: '' },
          };
          result = await wechatService.sendTemplateMessage(
            channel,
            openIdRecord.openId,
            app.templateId,
            templateData
          );
        } else {
          // 发送客服消息
          const content = message.desp
            ? `${message.title}\n\n${message.desp}`
            : message.title;
          result = await wechatService.sendCustomMessage(
            channel,
            openIdRecord.openId,
            content
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
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    // 保存消息历史
    const messageRecord: Message = {
      id: pushId,
      direction: 'outbound',
      type: 'push',
      channelId: channel.id,
      appId: app.id,
      title: message.title,
      desp: message.desp,
      results,
      createdAt,
    };
    await messageService.saveMessage(messageRecord);

    return {
      pushId,
      total: targetOpenIds.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }
}

export const pushService = new PushService();
