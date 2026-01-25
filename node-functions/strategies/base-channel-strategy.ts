/**
 * BaseChannelStrategy - 所有渠道策略的抽象基类
 * 
 * 使用模板方法模式定义统一的发送流程：
 * 1. validateParams - 参数校验
 * 2. getAccessToken - 获取访问令牌（抽象方法）
 * 3. buildMessage - 构建消息体（抽象方法）
 * 4. sendRequest - 发送请求（抽象方法）
 * 5. parseResponse - 解析响应
 */

import type { Channel } from '../types/channel.js';
import type { PushMessage, PushResult, SendResult, DeliveryResult, ChannelCapability } from './types.js';
import { generatePushId } from '../shared/utils.js';

export abstract class BaseChannelStrategy {
  protected channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  /**
   * 获取渠道能力类型（抽象方法，子类必须实现）
   */
  abstract getChannelCapability(): ChannelCapability;

  /**
   * 模板方法：发送消息的完整流程
   * 定义了所有渠道必须遵循的发送流程顺序
   */
  async send(message: PushMessage, targets: string[]): Promise<PushResult> {
    // 1. 参数校验
    this.validateParams(message);

    const results: DeliveryResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // 2. 对每个目标发送消息
    for (const target of targets) {
      try {
        // 3. 获取访问令牌（Webhook 渠道返回空字符串）
        const token = await this.getAccessToken();

        // 4. 构建消息体
        const messageBody = this.buildMessage(message, target);

        // 5. 发送请求
        const result = await this.sendRequest(token, messageBody);

        // 6. 记录结果
        results.push({
          openId: target,
          ...result,
        });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        results.push({
          openId: target,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    return {
      pushId: generatePushId(),
      total: targets.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * 参数校验（可被子类重写）
   */
  protected validateParams(message: PushMessage): void {
    if (!message.title) {
      throw new Error('Message title is required');
    }
  }

  /**
   * 获取访问令牌（抽象方法，子类必须实现）
   * Token 管理型渠道需要实现 token 获取和缓存逻辑
   * Webhook 型渠道返回空字符串
   */
  protected abstract getAccessToken(): Promise<string>;

  /**
   * 构建消息体（抽象方法，子类必须实现）
   * 根据渠道特定的消息格式构建消息体
   */
  protected abstract buildMessage(message: PushMessage, target: string): any;

  /**
   * 发送请求（抽象方法，子类必须实现）
   * 调用渠道特定的 API 发送消息
   */
  protected abstract sendRequest(token: string, messageBody: any): Promise<SendResult>;

  /**
   * 解析响应（可被子类重写）
   * 默认实现适用于微信类 API 的响应格式
   */
  protected parseResponse(response: any): SendResult {
    return {
      success: response.errcode === 0,
      msgId: response.msgid?.toString(),
      error: response.errmsg,
      errorCode: response.errcode,
    };
  }
}
