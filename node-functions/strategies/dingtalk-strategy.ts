/**
 * DingTalkStrategy - 钉钉群机器人推送策略
 *
 * 实现钉钉群机器人的消息发送逻辑：
 * - 支持 HMAC-SHA256 签名验证
 * - 支持 @mentions 功能（atMobiles 和 isAtAll）
 * - 消息长度限制：20,000 字符
 * - 速率限制：20 条/分钟（文档说明，不强制）
 */

import * as crypto from 'crypto';
import { WebhookStrategy } from './webhook-strategy.js';
import type { Channel, WebhookConfig } from '../types/channel.js';
import type { PushMessage, SendResult } from './types.js';

/**
 * 钉钉配置接口（扩展 WebhookConfig）
 */
interface DingTalkConfig extends WebhookConfig {
  atMobiles?: string[];  // 默认 @mentions 的手机号列表
  atAll?: boolean;       // 是否默认 @all
}

/**
 * 钉钉消息体接口
 */
interface DingTalkMessage {
  msgtype: 'text';
  text: {
    content: string;
  };
  at?: {
    atMobiles: string[];
    isAtAll: boolean;
  };
}

export class DingTalkStrategy extends WebhookStrategy {
  protected declare config: DingTalkConfig;

  constructor(channel: Channel) {
    super(channel);
    this.config = channel.config as DingTalkConfig;
  }

  /**
   * 构建钉钉消息体
   *
   * @param message - 推送消息
   * @param target - 目标用户（手机号）
   * @returns 钉钉消息体
   */
  protected buildMessage(message: PushMessage, _target: string): DingTalkMessage {
    // 组合标题和描述
    const content = message.desp
      ? `${message.title}\n\n${message.desp}`
      : message.title;

    // 验证消息长度（钉钉限制：20,000 字符）
    if (content.length > 20000) {
      throw new Error(`Message content exceeds DingTalk limit of 20,000 characters (current: ${content.length})`);
    }

    // 构建基础消息体
    const dingtalkMessage: DingTalkMessage = {
      msgtype: 'text',
      text: {
        content: content
      }
    };

    // 处理 @mentions
    // 优先级：消息级别 > 渠道级别配置
    const atMobiles = (message as any).atMobiles || this.config.atMobiles || [];
    const isAtAll = (message as any).atAll ?? this.config.atAll ?? false;

    // 只有在有 @mentions 或 @all 时才添加 at 字段
    if (atMobiles.length > 0 || isAtAll) {
      dingtalkMessage.at = {
        atMobiles: atMobiles,
        isAtAll: isAtAll
      };
    }

    return dingtalkMessage;
  }

  /**
   * 发送请求到钉钉 Webhook
   *
   * 重写父类方法以支持签名验证
   *
   * @param token - 访问令牌（Webhook 渠道不使用）
   * @param messageBody - 消息体
   * @returns 发送结果
   */
  protected async sendRequest(_token: string, messageBody: any): Promise<SendResult> {
    // 构建 Webhook URL
    let webhookUrl = this.config.webhookUrl;

    // 如果配置了 secret，添加签名参数
    if (this.config.secret) {
      const { timestamp, sign } = this.generateSignature(this.config.secret);
      webhookUrl += `&timestamp=${timestamp}&sign=${sign}`;
    }

    try {
      // 发送 POST 请求
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(messageBody)
      });

      // 检查 HTTP 状态
      if (!response.ok) {
        throw new Error(`DingTalk webhook request failed: ${response.status} ${response.statusText}`);
      }

      // 解析响应
      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 解析钉钉 API 响应
   *
   * @param response - API 响应
   * @returns 发送结果
   */
  protected parseResponse(response: any): SendResult {
    // 钉钉响应格式：{ errcode: number, errmsg: string }
    const success = response.errcode === 0;

    if (success) {
      return {
        success: true,
        msgId: undefined  // 钉钉不返回消息 ID
      };
    } else {
      return {
        success: false,
        error: response.errmsg,
        errorCode: response.errcode
      };
    }
  }

  /**
   * 生成钉钉 Webhook 签名
   *
   * 算法：
   * 1. 构建待签名字符串：timestamp + "\n" + secret
   * 2. 使用 HMAC-SHA256 计算签名
   * 3. Base64 编码
   * 4. URL 编码
   *
   * @param secret - 签名密钥
   * @returns 时间戳和签名
   */
  private generateSignature(secret: string): { timestamp: number; sign: string } {
    // 当前时间戳（毫秒）
    const timestamp = Date.now();

    // 构建待签名字符串：timestamp + "\n" + secret
    const stringToSign = `${timestamp}\n${secret}`;

    // 计算 HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringToSign);

    // Base64 编码
    const base64Sign = hmac.digest('base64');

    // URL 编码
    const sign = encodeURIComponent(base64Sign);

    return { timestamp, sign };
  }
}
