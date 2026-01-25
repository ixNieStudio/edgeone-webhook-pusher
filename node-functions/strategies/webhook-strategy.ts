/**
 * WebhookStrategy - Webhook 型渠道的抽象基类
 * 
 * 提供 Webhook 渠道的通用实现：
 * - 跳过 Token 获取步骤（返回空字符串）
 * - 直接向 Webhook URL 发送 POST 请求
 * - 子类只需实现消息格式构建
 */

import { BaseChannelStrategy } from './base-channel-strategy.js';
import type { Channel, WebhookConfig } from '../types/channel.js';
import type { SendResult, ChannelCapability } from './types.js';
import { ChannelCapability as ChannelCapabilityEnum } from './types.js';

export abstract class WebhookStrategy extends BaseChannelStrategy {
  protected config: WebhookConfig;

  constructor(channel: Channel) {
    super(channel);
    this.config = channel.config as WebhookConfig;
  }

  /**
   * 获取渠道能力类型
   */
  getChannelCapability(): ChannelCapability {
    return ChannelCapabilityEnum.WEBHOOK;
  }

  /**
   * Webhook 渠道不需要 Token，返回空字符串
   */
  protected async getAccessToken(): Promise<string> {
    return '';
  }

  /**
   * 发送到 Webhook URL
   */
  protected async sendRequest(token: string, messageBody: any): Promise<SendResult> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody),
      });

      const data = await response.json();
      return this.parseWebhookResponse(data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 解析 Webhook 响应（子类可重写）
   */
  protected parseWebhookResponse(response: any): SendResult {
    return {
      success: response.errcode === 0 || response.code === 0,
      msgId: response.msgid?.toString() || response.message_id,
      error: response.errmsg || response.msg,
      errorCode: response.errcode || response.code,
    };
  }
}
