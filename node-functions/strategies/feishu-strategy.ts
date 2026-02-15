/**
 * FeishuStrategy - 飞书群机器人推送策略
 *
 * 实现飞书群机器人的消息发送逻辑：
 * - 支持 SHA-256 签名验证（注意：不是 HMAC-SHA256）
 * - 签名包含在请求体中（不是 URL 参数）
 * - 时间戳使用秒（不是毫秒）
 * - 消息长度限制：30,000 字符
 * - 速率限制：100 条/分钟（文档说明，不强制）
 * - 支持新旧两种响应格式
 */

import * as crypto from 'crypto';
import { WebhookStrategy } from './webhook-strategy.js';
import type { Channel, WebhookConfig } from '../types/channel.js';
import type { PushMessage, SendResult } from './types.js';

/**
 * 飞书消息体接口
 */
interface FeishuMessage {
  msg_type: 'text';
  content: {
    text: string;
  };
  timestamp?: string;
  sign?: string;
}

export class FeishuStrategy extends WebhookStrategy {
  protected declare config: WebhookConfig;

  constructor(channel: Channel) {
    super(channel);
    this.config = channel.config as WebhookConfig;
  }

  /**
   * 构建飞书消息体
   *
   * @param message - 推送消息
   * @param _target - 目标用户（飞书 webhook 不使用此参数）
   * @returns 飞书消息体
   */
  protected buildMessage(message: PushMessage, _target: string): FeishuMessage {
    // 组合标题和描述
    const content = message.desp
      ? `${message.title}\n\n${message.desp}`
      : message.title;

    // 验证消息长度（飞书限制：30,000 字符）
    if (content.length > 30000) {
      throw new Error(`Message content exceeds Feishu limit of 30,000 characters (current: ${content.length})`);
    }

    // 构建基础消息体
    const feishuMessage: FeishuMessage = {
      msg_type: 'text',
      content: {
        text: content
      }
    };

    // 如果配置了 secret，添加签名
    if (this.config.secret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(feishuMessage);
      const sign = this.generateSignature(this.config.secret, timestamp, body);

      // 添加时间戳和签名到消息体
      feishuMessage.timestamp = timestamp;
      feishuMessage.sign = sign;
    }

    return feishuMessage;
  }

  /**
   * 发送请求到飞书 Webhook
   *
   * 重写父类方法以支持签名验证
   *
   * @param _token - 访问令牌（Webhook 渠道不使用）
   * @param messageBody - 消息体
   * @returns 发送结果
   */
  protected async sendRequest(_token: string, messageBody: any): Promise<SendResult> {
    // Webhook URL 是完整的（不需要添加参数）
    const webhookUrl = this.config.webhookUrl;

    try {
      // 发送 POST 请求
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      });

      // 检查 HTTP 状态
      if (!response.ok) {
        throw new Error(`Feishu webhook request failed: ${response.status} ${response.statusText}`);
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
   * 解析飞书 API 响应
   *
   * 飞书有两种响应格式：
   * - 新格式：{ code: number, msg: string, data?: object }
   * - 旧格式：{ errcode: number, errmsg: string }
   *
   * @param response - API 响应
   * @returns 发送结果
   */
  protected parseResponse(response: any): SendResult {
    // 判断响应格式
    const hasNewFormat = 'code' in response;
    const hasLegacyFormat = 'errcode' in response;

    if (hasNewFormat) {
      // 新格式：{ code, msg, data }
      const success = response.code === 0;

      if (success) {
        return {
          success: true,
          msgId: response.data?.message_id
        };
      } else {
        return {
          success: false,
          error: response.msg,
          errorCode: response.code
        };
      }
    } else if (hasLegacyFormat) {
      // 旧格式：{ errcode, errmsg }
      const success = response.errcode === 0;

      if (success) {
        return {
          success: true,
          msgId: undefined
        };
      } else {
        return {
          success: false,
          error: response.errmsg,
          errorCode: response.errcode
        };
      }
    } else {
      // 未知格式
      throw new Error('Unknown Feishu response format');
    }
  }

  /**
   * 生成飞书 Webhook 签名
   *
   * 算法：
   * 1. 构建待签名字符串：timestamp + secret + body（直接拼接，无分隔符）
   * 2. 使用 SHA-256 计算哈希（注意：不是 HMAC-SHA256）
   * 3. 转换为小写十六进制字符串
   *
   * 重要：这是 SHA-256，不是 HMAC-SHA256（与钉钉不同）
   *
   * @param secret - 飞书机器人加密密钥（32 字符）
   * @param timestamp - Unix 时间戳（秒，字符串格式）
   * @param body - JSON 请求体（字符串）
   * @returns 小写十六进制签名
   */
  private generateSignature(secret: string, timestamp: string, body: string): string {
    // 构建待签名字符串：timestamp + secret + body（直接拼接）
    const stringToSign = `${timestamp}${secret}${body}`;

    // 计算 SHA-256（注意：不是 HMAC-SHA256）
    const hash = crypto.createHash('sha256');
    hash.update(stringToSign, 'utf8');

    // 转换为小写十六进制字符串
    const sign = hash.digest('hex').toLowerCase();

    return sign;
  }
}
