/**
 * Channel Adapter Registry
 * Feature: multi-tenant-refactor
 *
 * Manages channel adapters for different messaging platforms.
 * Designed for extensibility - new channels can be added by:
 * 1. Creating a new adapter file implementing the ChannelAdapter interface
 * 2. Registering it in this registry
 *
 * ChannelAdapter Interface:
 * {
 *   type: string,                    // Unique identifier
 *   name: string,                    // Display name
 *   description?: string,            // Channel description
 *   send(message, credentials): Promise<SendResult>,
 *   validate(credentials): Promise<ValidateResult>,
 *   getConfigSchema(): Object,
 *   getRequiredFields(): string[],
 *   getSensitiveFields(): string[],
 * }
 */

import { wechatTemplateAdapter } from './wechat-template.js';

/**
 * Channel adapter registry
 * Add new channel adapters here
 */
const channelAdapters = new Map();

// Register built-in adapters
channelAdapters.set('wechat-template', wechatTemplateAdapter);

/**
 * Register a new channel adapter
 * @param {Object} adapter - Channel adapter implementing the interface
 * @throws {Error} If adapter is invalid or type already registered
 */
export function registerChannelAdapter(adapter) {
  if (!adapter || !adapter.type) {
    throw new Error('Invalid adapter: missing type');
  }
  if (!adapter.send || typeof adapter.send !== 'function') {
    throw new Error('Invalid adapter: missing send method');
  }
  if (channelAdapters.has(adapter.type)) {
    throw new Error(`Adapter already registered: ${adapter.type}`);
  }
  channelAdapters.set(adapter.type, adapter);
}

/**
 * Get adapter by channel type
 * @param {string} type - Channel type identifier
 * @returns {Object|undefined}
 */
export function getChannelAdapter(type) {
  return channelAdapters.get(type);
}

/**
 * Get all registered channel adapters
 * @returns {Object[]}
 */
export function getAllChannelAdapters() {
  return Array.from(channelAdapters.values());
}

/**
 * Get all supported channel types
 * @returns {string[]}
 */
export function getSupportedChannelTypes() {
  return Array.from(channelAdapters.keys());
}

/**
 * Check if a channel type is supported
 * @param {string} type
 * @returns {boolean}
 */
export function isChannelSupported(type) {
  return channelAdapters.has(type);
}

/**
 * Get channel info (without sensitive methods)
 * @param {string} type
 * @returns {Object|null}
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
 * Get all channels info
 * @returns {Object[]}
 */
export function getAllChannelsInfo() {
  return getSupportedChannelTypes().map(getChannelInfo).filter(Boolean);
}

/**
 * Get sensitive fields for a channel type
 * @param {string} type
 * @returns {string[]}
 */
export function getSensitiveFields(type) {
  const adapter = channelAdapters.get(type);
  if (!adapter) return [];

  // Use adapter method if available
  if (adapter.getSensitiveFields) {
    return adapter.getSensitiveFields();
  }

  // Fallback: check schema for sensitive fields
  const schema = adapter.getConfigSchema?.() || {};
  return Object.entries(schema)
    .filter(([, field]) => field.sensitive)
    .map(([key]) => key);
}

/**
 * Validate credentials for a channel
 * @param {string} type - Channel type
 * @param {Object} credentials - Credentials to validate
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function validateChannelCredentials(type, credentials) {
  const adapter = channelAdapters.get(type);
  if (!adapter) {
    return { valid: false, error: `Unknown channel type: ${type}` };
  }

  if (!adapter.validate) {
    return { valid: true }; // No validation method, assume valid
  }

  return adapter.validate(credentials);
}

/**
 * Send message via channel
 * @param {string} type - Channel type
 * @param {Object} message - Message to send
 * @param {Object} credentials - Channel credentials
 * @returns {Promise<{ success: boolean, error?: string, externalId?: string }>}
 */
export async function sendViaChannel(type, message, credentials) {
  const adapter = channelAdapters.get(type);
  if (!adapter) {
    return { success: false, error: `Unknown channel type: ${type}` };
  }

  return adapter.send(message, credentials);
}

// Export for backward compatibility
export { wechatTemplateAdapter } from './wechat-template.js';
