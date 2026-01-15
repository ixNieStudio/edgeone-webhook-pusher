/**
 * Config Service - 系统配置管理
 */

import { configKV } from '../shared/kv-client.js';
import { now } from '../shared/utils.js';
import type { SystemConfig } from '../types/index.js';
import { KVKeys, DefaultConfig } from '../types/index.js';

/**
 * ConfigService - 管理应用配置
 */
class ConfigService {
  /**
   * 获取应用配置（带默认值）
   */
  async getConfig(): Promise<SystemConfig | null> {
    const config = await configKV.get<SystemConfig>(KVKeys.CONFIG);
    if (!config) return null;
    return this.applyDefaults(config);
  }

  /**
   * 应用默认值到配置
   */
  applyDefaults(config: SystemConfig): SystemConfig {
    return {
      ...config,
      rateLimit: {
        perMinute: config.rateLimit?.perMinute ?? DefaultConfig.rateLimit.perMinute,
      },
      retention: {
        days: config.retention?.days ?? DefaultConfig.retention.days,
      },
    };
  }

  /**
   * 保存初始配置（用于初始化）
   */
  async saveConfig(config: SystemConfig): Promise<void> {
    await configKV.put(KVKeys.CONFIG, config);
  }

  /**
   * 更新应用配置（不包括 adminToken）
   * Admin Token 在初始化后不可变 - 这是安全要求
   */
  async updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Configuration not initialized');
    }

    // 安全：禁止更新 adminToken - 初始化后不可变
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { adminToken, createdAt, ...allowedUpdates } = updates;

    if (updates.adminToken !== undefined) {
      console.warn('Attempted to update adminToken - this is not allowed');
    }

    const updatedConfig: SystemConfig = {
      ...config,
      ...allowedUpdates,
      wechat: updates.wechat ? {
        appId: updates.wechat.appId ?? config.wechat?.appId ?? '',
        appSecret: updates.wechat.appSecret ?? config.wechat?.appSecret ?? '',
        templateId: updates.wechat.templateId ?? config.wechat?.templateId,
      } : config.wechat,
      rateLimit: {
        perMinute: updates.rateLimit?.perMinute ?? config.rateLimit?.perMinute ?? DefaultConfig.rateLimit.perMinute,
      },
      retention: {
        days: updates.retention?.days ?? config.retention?.days ?? DefaultConfig.retention.days,
      },
      updatedAt: now(),
    };

    await configKV.put(KVKeys.CONFIG, updatedConfig);
    return updatedConfig;
  }

  /**
   * 检查配置是否存在
   */
  async exists(): Promise<boolean> {
    const config = await configKV.get<SystemConfig>(KVKeys.CONFIG);
    return config !== null;
  }

  /**
   * 获取微信配置
   */
  async getWeChatConfig(): Promise<SystemConfig['wechat'] | null> {
    const config = await this.getConfig();
    if (!config || !config.wechat) return null;
    return config.wechat;
  }

  /**
   * 获取速率限制配置
   */
  async getRateLimitPerMinute(): Promise<number> {
    const config = await this.getConfig();
    return config?.rateLimit?.perMinute ?? DefaultConfig.rateLimit.perMinute;
  }

  /**
   * 获取消息保留天数
   */
  async getRetentionDays(): Promise<number> {
    const config = await this.getConfig();
    return config?.retention?.days ?? DefaultConfig.retention.days;
  }

  /**
   * 脱敏配置用于 API 响应
   */
  maskConfig(config: SystemConfig): Partial<SystemConfig> & { adminToken?: string } {
    return {
      ...config,
      adminToken: config.adminToken ? '***' : undefined,
      wechat: config.wechat
        ? {
            appId: config.wechat.appId,
            appSecret: config.wechat.appSecret ? '***' : '',
            templateId: config.wechat.templateId,
          }
        : undefined,
    };
  }
}

export const configService = new ConfigService();
