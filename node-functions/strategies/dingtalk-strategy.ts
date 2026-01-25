/**
 * DingTalkStrategy - 钉钉 Webhook 渠道策略（预留）
 * 
 * 实现钉钉的消息发送逻辑
 */

import { WebhookStrategy } from './webhook-strategy.js';
import type { PushMessage } from './types.js';

export class DingTalkStrategy extends WebhookStrategy {
  /**
   * 构建钉钉消息体
   * TODO: 在任务 6 中实现完整逻辑
   */
  protected buildMessage(message: PushMessage, target: string): any {
    return {
      msgtype: 'text',
      text: {
        content: message.desp
          ? `${message.title}\n\n${message.desp}`
          : message.title,
      },
      at: {
        atMobiles: [target],
        isAtAll: false,
      },
    };
  }
}
