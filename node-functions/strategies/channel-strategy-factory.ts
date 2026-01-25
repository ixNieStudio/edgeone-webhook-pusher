/**
 * ChannelStrategyFactory - 策略工厂
 * 
 * 根据渠道类型创建对应的策略实例
 */

import type { Channel } from '../types/channel.js';
import type { BaseChannelStrategy } from './base-channel-strategy.js';
import { WeChatStrategy } from './wechat-strategy.js';
import { WorkWeChatStrategy } from './work-wechat-strategy.js';
import { DingTalkStrategy } from './dingtalk-strategy.js';
import { FeishuStrategy } from './feishu-strategy.js';

export class ChannelStrategyFactory {
  /**
   * 根据渠道类型创建对应的策略
   * @param channel - 渠道配置
   * @returns 对应的渠道策略实例
   * @throws 如果渠道类型不支持
   */
  createStrategy(channel: Channel): BaseChannelStrategy {
    switch (channel.type) {
      case 'wechat':
        return new WeChatStrategy(channel);
      case 'work_wechat':
        return new WorkWeChatStrategy(channel);
      case 'dingtalk':
        return new DingTalkStrategy(channel);
      case 'feishu':
        return new FeishuStrategy(channel);
      default:
        throw new Error(`Unsupported channel type: ${(channel as any).type}`);
    }
  }
}
