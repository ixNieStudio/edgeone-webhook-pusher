import type { ChannelAdapter, ChannelType } from '../types/index.js';
import { wechatTemplateAdapter } from './wechat-template.js';

/**
 * Channel adapter registry
 */
export const channelAdapters: Record<ChannelType, ChannelAdapter> = {
  'wechat-template': wechatTemplateAdapter,
};

/**
 * Get adapter by channel type
 */
export function getChannelAdapter(type: ChannelType): ChannelAdapter | undefined {
  return channelAdapters[type];
}

/**
 * Get all supported channel types
 */
export function getSupportedChannelTypes(): ChannelType[] {
  return Object.keys(channelAdapters) as ChannelType[];
}

/**
 * Get sensitive fields for a channel type
 */
export function getSensitiveFields(type: ChannelType): string[] {
  const adapter = channelAdapters[type];
  if (!adapter) return [];

  const schema = adapter.getConfigSchema();
  return Object.entries(schema)
    .filter(([, field]) => field.sensitive)
    .map(([key]) => key);
}
