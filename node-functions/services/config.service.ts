/**
 * Config Service - 系统配置管理
 */

import { configKV } from '../shared/kv-client.js';
import { now, generateAdminToken, validatePasswordFormat } from '../shared/utils.js';
import type { SystemConfig } from '../types/index.js';
import { KVKeys, DefaultConfig } from '../types/index.js';

/**
 * ConfigService - 管理应用配置
 * 只管理 adminToken、rateLimit 和 retention 设置
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
   * 只处理 rateLimit 和 retention，忽略其他字段
   */
  async updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Configuration not initialized');
    }

    // 安全：禁止更新 adminToken - 初始化后不可变
    if (updates.adminToken !== undefined) {
      console.warn('Attempted to update adminToken - this is not allowed');
    }

    // 只更新 rateLimit 和 retention
    const updatedConfig: SystemConfig = {
      ...config,
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
    };
  }

  /**
   * 重置管理员令牌（支持自定义密码）
   * 生成新的 adminToken 并更新配置，保持其他配置字段不变
   * @param newPassword - 可选的自定义密码
   * @param confirmPassword - 可选的确认密码
   * @returns 包含新 adminToken 的配置对象
   * @throws 如果配置未初始化、密码验证失败或更新失败
   */
  async resetAdminToken(
    newPassword?: string,
    confirmPassword?: string
  ): Promise<SystemConfig> {
    // 获取当前配置
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Configuration not initialized');
    }

    let newAdminToken: string;
    
    // 如果提供了自定义密码
    if (newPassword !== undefined && newPassword !== null && newPassword !== '') {
      // 验证必须提供确认密码
      if (!confirmPassword) {
        throw new Error('CONFIRMATION_REQUIRED');
      }
      
      // 验证两次密码是否一致
      if (newPassword !== confirmPassword) {
        throw new Error('PASSWORD_MISMATCH');
      }
      
      // 验证密码格式
      if (!validatePasswordFormat(newPassword)) {
        throw new Error('PASSWORD_INVALID');
      }
      
      // 使用自定义密码（不添加前缀）
      newAdminToken = newPassword;
    } else {
      // 自动生成随机令牌
      newAdminToken = generateAdminToken();
    }

    // 创建更新后的配置，保持其他字段不变
    const updatedConfig: SystemConfig = {
      ...config,
      adminToken: newAdminToken,
      updatedAt: now(),
    };

    try {
      // 保存更新后的配置
      await configKV.put(KVKeys.CONFIG, updatedConfig);
      return updatedConfig;
    } catch (error) {
      // 如果保存失败，抛出错误（配置保持不变）
      console.error('Failed to reset admin token:', error);
      throw new Error('Failed to update configuration');
    }
  }
}

export const configService = new ConfigService();
