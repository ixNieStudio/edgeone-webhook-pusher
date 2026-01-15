import { configKV } from '../shared/kv-client.js';
import { now } from '../shared/utils.js';
import { KVKeys, DefaultConfig } from '../shared/types.js';

/**
 * ConfigService - Manages application configuration
 */
class ConfigService {
  /**
   * Get application configuration with defaults
   * @returns {Promise<import('../shared/types.js').AppConfig | null>}
   */
  async getConfig() {
    const config = await configKV.get(KVKeys.CONFIG);
    if (!config) return null;

    // Fill in defaults for missing optional fields
    return this.applyDefaults(config);
  }

  /**
   * Apply default values to config
   * @param {Object} config
   * @returns {import('../shared/types.js').AppConfig}
   */
  applyDefaults(config) {
    return {
      ...config,
      rateLimit: {
        perMinute: config.rateLimit?.perMinute ?? DefaultConfig.rateLimit.perMinute,
      },
      retention: {
        days: config.retention?.days ?? DefaultConfig.retention.days,
      },
      wechat: config.wechat || {
        appId: '',
        appSecret: '',
        templateId: '',
        msgToken: '',
      },
    };
  }

  /**
   * Save initial configuration (used during initialization)
   * @param {import('../shared/types.js').AppConfig} config
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    await configKV.put(KVKeys.CONFIG, config);
  }

  /**
   * Update application configuration (excludes adminToken)
   * Admin Token is immutable after initialization - this is a security requirement.
   * @param {Partial<import('../shared/types.js').AppConfig>} updates
   * @returns {Promise<import('../shared/types.js').AppConfig>}
   */
  async updateConfig(updates) {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Configuration not initialized');
    }

    // SECURITY: Prevent updating adminToken - it is immutable after initialization
    // This ensures Property 1: Admin Token Immutability
    const { adminToken, createdAt, ...allowedUpdates } = updates;
    
    // Log warning if someone tries to update adminToken
    if (updates.adminToken !== undefined) {
      console.warn('Attempted to update adminToken - this is not allowed');
    }

    const updatedConfig = {
      ...config,
      ...allowedUpdates,
      // Merge nested objects
      wechat: {
        ...config.wechat,
        ...(updates.wechat || {}),
      },
      rateLimit: {
        ...config.rateLimit,
        ...(updates.rateLimit || {}),
      },
      retention: {
        ...config.retention,
        ...(updates.retention || {}),
      },
      updatedAt: now(),
    };

    await configKV.put(KVKeys.CONFIG, updatedConfig);
    return updatedConfig;
  }

  /**
   * Check if configuration exists
   * @returns {Promise<boolean>}
   */
  async exists() {
    const config = await configKV.get(KVKeys.CONFIG);
    return config !== null;
  }

  /**
   * Get WeChat configuration
   * @returns {Promise<{ appId: string, appSecret: string, templateId: string } | null>}
   */
  async getWeChatConfig() {
    const config = await this.getConfig();
    if (!config || !config.wechat) return null;
    return config.wechat;
  }

  /**
   * Get rate limit configuration
   * @returns {Promise<number>}
   */
  async getRateLimitPerMinute() {
    const config = await this.getConfig();
    return config?.rateLimit?.perMinute ?? DefaultConfig.rateLimit.perMinute;
  }

  /**
   * Get message retention days
   * @returns {Promise<number>}
   */
  async getRetentionDays() {
    const config = await this.getConfig();
    return config?.retention?.days ?? DefaultConfig.retention.days;
  }

  /**
   * Mask sensitive fields in config for API response
   * @param {import('../shared/types.js').AppConfig} config
   * @returns {Object}
   */
  maskConfig(config) {
    return {
      ...config,
      adminToken: config.adminToken ? '***' : undefined,
      wechat: config.wechat
        ? {
            appId: config.wechat.appId,
            appSecret: config.wechat.appSecret ? '***' : '',
            templateId: config.wechat.templateId,
            msgToken: config.wechat.msgToken || '',
          }
        : undefined,
    };
  }
}

export const configService = new ConfigService();
