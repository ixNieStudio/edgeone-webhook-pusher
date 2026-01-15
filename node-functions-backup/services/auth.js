import { configService } from './config.js';
import { generateAdminToken, now, isValidAdminToken } from '../shared/utils.js';
import { DefaultConfig } from '../shared/types.js';

/**
 * AuthService - Manages initialization and admin token validation
 */
class AuthService {
  /**
   * Check if the application is initialized
   * @returns {Promise<boolean>}
   */
  async isInitialized() {
    const config = await configService.getConfig();
    return config !== null && !!config.adminToken;
  }

  /**
   * Initialize the application and generate admin token
   * This operation is idempotent - calling it on an already initialized system
   * will throw an error and NOT modify the existing Admin Token.
   * This ensures Property 3: Initialization Idempotence
   * @param {Object} [wechatConfig] - Optional WeChat configuration
   * @returns {Promise<{ adminToken: string, config: import('../shared/types.js').AppConfig }>}
   */
  async initialize(wechatConfig) {
    // Check if already initialized - this ensures idempotence
    const isInit = await this.isInitialized();
    if (isInit) {
      throw new Error('Application is already initialized');
    }

    // Generate admin token
    const adminToken = generateAdminToken();
    const timestamp = now();

    // Create initial config
    const config = {
      adminToken,
      wechat: wechatConfig || {
        appId: '',
        appSecret: '',
        templateId: '',
      },
      rateLimit: {
        perMinute: DefaultConfig.rateLimit.perMinute,
      },
      retention: {
        days: DefaultConfig.retention.days,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Save config
    await configService.saveConfig(config);

    return { adminToken, config };
  }

  /**
   * Validate admin token
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async validateAdminToken(token) {
    if (!token || !isValidAdminToken(token)) {
      return false;
    }

    const config = await configService.getConfig();
    if (!config || !config.adminToken) {
      return false;
    }

    return config.adminToken === token;
  }

  /**
   * Extract admin token from request headers
   * @param {Object} headers - Request headers (can be Headers object or plain object)
   * @returns {string | null}
   */
  extractToken(headers) {
    // Support both Headers object and plain object
    const authHeader = headers.get
      ? headers.get('authorization')
      : headers['authorization'] || headers['Authorization'];

    if (!authHeader) return null;

    // Support "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Support direct token
    return authHeader;
  }

  /**
   * Get initialization status for API response
   * @returns {Promise<{ initialized: boolean, hasWeChatConfig: boolean }>}
   */
  async getStatus() {
    const config = await configService.getConfig();
    const initialized = config !== null && !!config.adminToken;
    const hasWeChatConfig =
      initialized && !!config.wechat?.appId && !!config.wechat?.appSecret && !!config.wechat?.templateId;

    return {
      initialized,
      hasWeChatConfig,
    };
  }
}

export const authService = new AuthService();
