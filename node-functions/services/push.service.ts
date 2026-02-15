/**
 * Push Service - 消息推送核心逻辑
 * 
 * 使用策略模式处理多渠道推送：
 * - 根据渠道类型动态选择策略
 * - 支持微信、企业微信、钉钉、飞书等多种渠道
 * - 统一的推送接口，保持 API 兼容性
 */

import { appService } from './app.service.js';
import { openidService } from './openid.service.js';
import { channelService } from './channel.service.js';
import { messageService } from './message.service.js';
import { generatePushId, now } from '../shared/utils.js';
import { isWeChatApp, isWorkWeChatApp, isWebhookApp } from '../shared/type-guards.js';
import { ChannelStrategyFactory } from '../strategies/channel-strategy-factory.js';
import type { PushMessage } from '../strategies/types.js';
import type { PushResult, PushMessageInput, Message, App, Channel } from '../types/index.js';
import { PushModes } from '../types/index.js';

class PushService {
  private factory: ChannelStrategyFactory;

  constructor() {
    this.factory = new ChannelStrategyFactory();
  }

  /**
   * 通过 App Key 发送消息
   */
  async push(appKey: string, message: PushMessageInput): Promise<PushResult> {
    const pushId = generatePushId();
    const createdAt = now();

    // 1. 查找 App
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

    // 2. 获取渠道配置
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

    // 3. 根据渠道类型获取推送目标
    const targets = await this.getTargets(app, channel);
    if (targets.length === 0) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      };
    }

    // 4. 创建渠道策略
    const strategy = this.factory.createStrategy(channel);

    // 5. 构建策略消息格式
    const strategyMessage: PushMessage = {
      title: message.title,
      desp: message.desp,
      // 如果是微信应用且有模板配置，传递模板信息
      ...(isWeChatApp(app) && app.templateId && {
        templateId: app.templateId,
        templateData: {
          first: { value: message.title || '' },
          keyword1: { value: message.desp || '' },
          remark: { value: '' },
        },
      }),
    };

    // 6. 执行推送
    const result = await strategy.send(strategyMessage, targets);

    // 7. 保存消息历史
    const messageRecord: Message = {
      id: pushId,
      direction: 'outbound',
      type: 'push',
      channelId: channel.id,
      appId: app.id,
      title: message.title,
      desp: message.desp,
      results: result.results,
      createdAt,
    };
    await messageService.saveMessage(messageRecord);

    // 8. 返回结果（使用生成的 pushId 而不是策略返回的）
    return {
      ...result,
      pushId,
    };
  }

  /**
   * 根据应用和渠道类型获取推送目标
   * 
   * 不同渠道类型有不同的目标获取逻辑：
   * - 微信：从 OpenID 表获取，支持 single/subscribe 模式
   * - 企业微信：从应用配置获取用户ID和部门ID
   * - Webhook：使用 Webhook URL 作为目标
   */
  private async getTargets(app: App, channel: Channel): Promise<string[]> {
    switch (channel.type) {
      case 'wechat': {
        // 微信：从 OpenID 表获取
        const openIds = await openidService.listByApp(app.id);
        if (openIds.length === 0) {
          return [];
        }

        // 使用类型守卫检查应用类型
        if (isWeChatApp(app)) {
          if (app.pushMode === PushModes.SINGLE) {
            // 单发模式：只发送给第一个 OpenID
            return [openIds[0].openId];
          }
        }
        
        // 订阅模式：发送给所有 OpenID
        return openIds.map(o => o.openId);
      }

      case 'work_wechat': {
        // 企业微信：从应用配置获取用户ID和部门ID
        if (!isWorkWeChatApp(app)) {
          return [];
        }

        const targets: string[] = [];

        if (app.userIds && app.userIds.length > 0) {
          targets.push(...app.userIds);
        }
        if (app.departmentIds && app.departmentIds.length > 0) {
          // 部门ID添加前缀以区分用户ID
          targets.push(...app.departmentIds.map(id => `dept_${id}`));
        }

        return targets;
      }

      case 'dingtalk':
      case 'feishu': {
        // Webhook 渠道：使用 Webhook URL 作为目标
        if (!isWebhookApp(app)) {
          return [];
        }

        return [app.webhookUrl];
      }

      default:
        throw new Error(`Unsupported channel type: ${(channel as any).type}`);
    }
  }
}

export const pushService = new PushService();
