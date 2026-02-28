/**
 * Push Service - 消息推送核心逻辑
 * 
 * 使用策略模式处理多渠道推送：
 * - 根据渠道类型动态选择策略
 * - 支持微信、企业微信、钉钉、飞书等多种渠道
 * - 统一的推送接口，保持 API 兼容性
 */

import { appService } from './app.service.js';
import { demoAppService } from './demo-app.service.js';
import { openidService } from './openid.service.js';
import { channelService } from './channel.service.js';
import { messageService } from './message.service.js';
import { generatePushId, now } from '../shared/utils.js';
import { isWeChatApp, isWorkWeChatApp } from '../shared/type-guards.js';
import { ChannelStrategyFactory } from '../strategies/channel-strategy-factory.js';
import type { PushMessage } from '../strategies/types.js';
import type { PushResult, PushMessageInput, Message, App, DemoApp } from '../types/index.js';
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

    // 1. 查找 App (先查生产应用，再查体验应用)
    let app = await appService.getByKey(appKey);
    let isDemoApp = false;
    
    if (!app) {
      // 尝试查找体验应用
      const demoApp = await demoAppService.getByKey(appKey);
      if (demoApp) {
        // 将 DemoApp 转换为 App 格式用于推送
        app = this.convertDemoAppToApp(demoApp);
        isDemoApp = true;
      }
    }
    
    if (!app) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      };
    }

    // 2. 并行获取渠道配置和推送目标，缩短主链路等待时间
    const [channel, targets] = await Promise.all([
      channelService.getById(app.channelId),
      this.getTargets(app),
    ]);

    if (!channel) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      };
    }

    // 3. 校验推送目标
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
    void messageService.saveMessage(messageRecord, { skipIndexes: true }).catch((error) => {
      // 日志落盘失败不影响主流程
      if (process.env.DEBUG_KV_URL === 'true') {
        console.error('[PushService] Failed to save message record:', error);
      }
    });

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
  private async getTargets(app: App): Promise<string[]> {
    switch (app.channelType) {
      case 'wechat': {
        // 使用类型守卫检查应用类型
        if (isWeChatApp(app)) {
          if (app.pushMode === PushModes.SINGLE) {
            // 单发模式：只读取首个 OpenID，避免全量加载
            const openId = await openidService.getFirstOpenIdByApp(app.id);
            return openId ? [openId] : [];
          }
        }

        // 订阅模式：发送给所有 OpenID
        return await openidService.listOpenIdValuesByApp(app.id);
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
        // Webhook 渠道：使用渠道的 Webhook URL 作为目标
        // 返回一个占位符，实际 URL 从 channel.config 获取
        return ['webhook'];
      }

      default:
        throw new Error(`Unsupported channel type: ${(app as any).channelType}`);
    }
  }

  /**
   * 将 DemoApp 转换为 App 格式
   * Demo 应用只支持微信渠道的模板消息
   */
  private convertDemoAppToApp(demoApp: DemoApp): App {
    return {
      id: demoApp.id,
      key: demoApp.key,
      name: demoApp.name,
      channelId: demoApp.channelId,
      channelType: 'wechat',
      pushMode: demoApp.pushMode,
      messageType: demoApp.messageType,
      templateId: demoApp.templateId,
      createdAt: demoApp.createdAt,
      updatedAt: demoApp.updatedAt,
    };
  }
}

export const pushService = new PushService();
