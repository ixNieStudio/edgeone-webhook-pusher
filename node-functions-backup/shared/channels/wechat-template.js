/**
 * WeChat Template Message Channel Adapter
 * Feature: multi-tenant-refactor
 *
 * Implements the channel adapter interface for WeChat template messages.
 * Access token is cached in KV storage for stateless operation.
 */

import { configKV } from '../kv-client.js';

// KV key for access token cache
const ACCESS_TOKEN_KEY = 'wechat_access_token';

/**
 * Get WeChat access token with KV caching (stateless)
 * @param {string} appId
 * @param {string} appSecret
 * @returns {Promise<string>}
 */
async function getAccessToken(appId, appSecret) {
  // Try to get cached token from KV
  try {
    const cached = await configKV.get(ACCESS_TOKEN_KEY);
    if (cached && cached.appId === appId && cached.expiresAt > Date.now()) {
      return cached.accessToken;
    }
  } catch {
    // Ignore cache read errors, will fetch new token
  }

  // Fetch new access token from WeChat API
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg}`);
  }

  if (!data.access_token || !data.expires_in) {
    throw new Error('Invalid WeChat API response');
  }

  // Cache token in KV (expire 5 minutes early for safety)
  const tokenData = {
    appId,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  try {
    await configKV.put(ACCESS_TOKEN_KEY, tokenData);
  } catch {
    // Ignore cache write errors, token is still valid
  }

  return data.access_token;
}

/**
 * WeChat Template Message Adapter
 * Implements the ChannelAdapter interface
 */
export const wechatTemplateAdapter = {
  /** Channel type identifier */
  type: 'wechat-template',

  /** Display name */
  name: '微信模板消息',

  /** Channel description */
  description: '通过微信公众号发送模板消息',

  /**
   * Send message via WeChat template
   * @param {{ id: string, title: string, content?: string, createdAt: string }} message
   * @param {Object} credentials - Channel credentials
   * @param {string} credentials.appId - WeChat AppID
   * @param {string} credentials.appSecret - WeChat AppSecret
   * @param {string} credentials.templateId - Template ID
   * @param {string} credentials.openId - Target user OpenID
   * @param {string} [credentials.url] - Click URL
   * @returns {Promise<{ success: boolean, error?: string, externalId?: string }>}
   */
  async send(message, credentials) {
    const { appId, appSecret, templateId, openId, url: clickUrl } = credentials;

    try {
      const accessToken = await getAccessToken(appId, appSecret);

      const apiUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: openId,
          template_id: templateId,
          url: clickUrl,
          data: {
            first: { value: message.title, color: '#173177' },
            keyword1: { value: message.content || '无内容', color: '#173177' },
            keyword2: {
              value: new Date(message.createdAt).toLocaleString('zh-CN'),
              color: '#173177',
            },
            remark: { value: 'Powered by EdgeOne Webhook Pusher', color: '#999999' },
          },
        }),
      });

      const data = await res.json();

      if (data.errcode === 0) {
        return { success: true, externalId: String(data.msgid) };
      } else {
        return { success: false, error: `${data.errcode}: ${data.errmsg}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Validate channel credentials
   * @param {Object} credentials
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  async validate(credentials) {
    const { appId, appSecret, templateId } = credentials;

    if (!appId || !appSecret || !templateId) {
      return { valid: false, error: 'Missing required credentials' };
    }

    try {
      await getAccessToken(appId, appSecret);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  },

  /**
   * Get configuration schema for this channel
   * @returns {Object}
   */
  getConfigSchema() {
    return {
      appId: {
        type: 'string',
        label: '公众号 AppID',
        required: true,
        description: '微信公众号的 AppID',
      },
      appSecret: {
        type: 'string',
        label: '公众号 AppSecret',
        required: true,
        sensitive: true,
        description: '微信公众号的 AppSecret',
      },
      templateId: {
        type: 'string',
        label: '模板消息 ID',
        required: true,
        description: '在公众号后台配置的模板消息 ID',
      },
      url: {
        type: 'string',
        label: '点击跳转链接',
        required: false,
        description: '用户点击消息后跳转的链接',
      },
    };
  },

  /**
   * Get required credential fields
   * @returns {string[]}
   */
  getRequiredFields() {
    return ['appId', 'appSecret', 'templateId'];
  },

  /**
   * Get sensitive credential fields (should be masked in responses)
   * @returns {string[]}
   */
  getSensitiveFields() {
    return ['appSecret'];
  },
};

/**
 * Clear access token cache (for testing or manual refresh)
 * @returns {Promise<void>}
 */
export async function clearAccessTokenCache() {
  try {
    await configKV.delete(ACCESS_TOKEN_KEY);
  } catch {
    // Ignore errors
  }
}
