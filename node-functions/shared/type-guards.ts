/**
 * 类型守卫工具函数
 * 
 * 提供类型安全的方式来处理联合类型，避免使用 as any
 */

import type { 
  Channel, 
  WeChatConfig, 
  WorkWeChatConfig, 
  WebhookConfig,
  App,
  WeChatAppConfig,
  WorkWeChatAppConfig,
  WebhookAppConfig
} from '../types/index.js';

/**
 * 检查是否为微信渠道配置
 */
export function isWeChatConfig(config: any): config is WeChatConfig {
  return config && typeof config.appId === 'string' && typeof config.appSecret === 'string';
}

/**
 * 检查是否为企业微信渠道配置
 */
export function isWorkWeChatConfig(config: any): config is WorkWeChatConfig {
  return config && typeof config.corpId === 'string' && typeof config.corpSecret === 'string';
}

/**
 * 检查是否为 Webhook 渠道配置
 */
export function isWebhookConfig(config: any): config is WebhookConfig {
  return config && typeof config.webhookUrl === 'string';
}

/**
 * 检查是否为微信渠道
 */
export function isWeChatChannel(channel: Channel): channel is Channel & { config: WeChatConfig } {
  return channel.type === 'wechat';
}

/**
 * 检查是否为企业微信渠道
 */
export function isWorkWeChatChannel(channel: Channel): channel is Channel & { config: WorkWeChatConfig } {
  return channel.type === 'work_wechat';
}

/**
 * 检查是否为 Webhook 渠道（钉钉或飞书）
 */
export function isWebhookChannel(channel: Channel): channel is Channel & { config: WebhookConfig } {
  return channel.type === 'dingtalk' || channel.type === 'feishu';
}

/**
 * 检查是否为微信应用配置
 */
export function isWeChatApp(app: App): app is WeChatAppConfig {
  return app.channelType === 'wechat';
}

/**
 * 检查是否为企业微信应用配置
 */
export function isWorkWeChatApp(app: App): app is WorkWeChatAppConfig {
  return app.channelType === 'work_wechat';
}

/**
 * 检查是否为 Webhook 应用配置
 */
export function isWebhookApp(app: App): app is WebhookAppConfig {
  return app.channelType === 'dingtalk' || app.channelType === 'feishu';
}

/**
 * 安全地获取微信配置
 * @throws 如果不是微信渠道
 */
export function getWeChatConfig(channel: Channel): WeChatConfig {
  if (!isWeChatChannel(channel)) {
    throw new Error(`Expected WeChat channel, got ${channel.type}`);
  }
  return channel.config;
}

/**
 * 安全地获取企业微信配置
 * @throws 如果不是企业微信渠道
 */
export function getWorkWeChatConfig(channel: Channel): WorkWeChatConfig {
  if (!isWorkWeChatChannel(channel)) {
    throw new Error(`Expected Work WeChat channel, got ${channel.type}`);
  }
  return channel.config;
}

/**
 * 安全地获取 Webhook 配置
 * @throws 如果不是 Webhook 渠道
 */
export function getWebhookConfig(channel: Channel): WebhookConfig {
  if (!isWebhookChannel(channel)) {
    throw new Error(`Expected Webhook channel, got ${channel.type}`);
  }
  return channel.config;
}
