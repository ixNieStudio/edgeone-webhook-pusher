/**
 * Channel Adapter Registry - 渠道适配器注册表
 * Module: channel
 */

import { wechatTemplateAdapter } from './wechat-template.js';

const channelAdapters = new Map();

// 注册内置适配器
channelAdapters.set('wechat-template', wechatTemplateAdapter);

/**
 * 注册渠道适配器
 */
export function registerChannelAdapter(adapter) {
  if (!adapter?.type) {
    throw new Error('Invalid adapter: missing type');
  }
  if (typeof adapter.send !== 'function') {
    throw new Error('Invalid adapter: missing send method');
  }
  if (channelAdapters.has(adapter.type)) {
    throw new Error(`Adapter already registered: ${adapter.type}`);
  }
  channelAdapters.set(adapter.type, adapter);
}

/**
 * 获取适配器
 */
export function getChannelAdapter(type) {
  return channelAdapters.get(type);
}

/**
 * 获取所有适配器
 */
export function getAllChannelAdapters() {
  return Array.from(channelAdapters.values());
}

/**
 * 获取支持的渠道类型
 */
export function getSupportedChannelTypes() {
  return Array.from(channelAdapters.keys());
}

/**
 * 检查渠道是否支持
 */
export function isChannelSupported(type) {
  return channelAdapters.has(type);
}

/**
 * 获取渠道信息
 */
export function getChannelInfo(type) {
  const adapter = channelAdapters.get(type);
  if (!adapter) return null;

  return {
    type: adapter.type,
    name: adapter.name,
    description: adapter.description,
    configSchema: adapter.getConfigSchema?.() || {},
    requiredFields: adapter.getRequiredFields?.() || [],
  };
}

/**
 * 获取所有渠道信息
 */
export function getAllChannelsInfo() {
  return getSupportedChannelTypes().map(getChannelInfo).filter(Boolean);
}

/**
 * 获取敏感字段
 */
export function getSensitiveFields(type) {
  const adapter = channelAdapters.get(type);
  if (!adapter) return [];
  return adapter.getSensitiveFields?.() || [];
}

/**
 * 验证渠道凭证
 */
export async function validateChannelCredentials(type, credentials) {
  const adapter = channelAdapters.get(type);
  if (!adapter) {
    return { valid: false, error: `Unknown channel type: ${type}` };
  }
  if (!adapter.validate) {
    return { valid: true };
  }
  return adapter.validate(credentials);
}

/**
 * 通过渠道发送消息
 */
export async function sendViaChannel(type, message, credentials) {
  const adapter = channelAdapters.get(type);
  if (!adapter) {
    return { success: false, error: `Unknown channel type: ${type}` };
  }
  return adapter.send(message, credentials);
}

export { wechatTemplateAdapter } from './wechat-template.js';
