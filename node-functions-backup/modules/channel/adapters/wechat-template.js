/**
 * WeChat Template Message Channel Adapter
 * Module: channel
 */

import { configKV } from '../../../shared/kv-client.js';

const ACCESS_TOKEN_KEY = 'wechat_access_token';

/**
 * 获取微信 access_token（带 KV 缓存）
 */
async function getAccessToken(appId, appSecret) {
  try {
    const cached = await configKV.get(ACCESS_TOKEN_KEY);
    if (cached && cached.appId === appId && cached.expiresAt > Date.now()) {
      return cached.accessToken;
    }
  } catch {
    // 忽略缓存读取错误
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg}`);
  }

  if (!data.access_token || !data.expires_in) {
    throw new Error('Invalid WeChat API response');
  }

  const tokenData = {
    appId,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  try {
    await configKV.put(ACCESS_TOKEN_KEY, tokenData);
  } catch {
    // 忽略缓存写入错误
  }

  return data.access_token;
}

/**
 * 微信模板消息适配器
 */
export const wechatTemplateAdapter = {
  type: 'wechat-template',
  name: '微信模板消息',
  description: '通过微信公众号发送模板消息',

  /**
   * 发送消息
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
            keyword2: { value: new Date(message.createdAt).toLocaleString('zh-CN'), color: '#173177' },
            remark: { value: 'Powered by EdgeOne Webhook Pusher', color: '#999999' },
          },
        }),
      });

      const data = await res.json();

      if (data.errcode === 0) {
        return { success: true, externalId: String(data.msgid) };
      }
      return { success: false, error: `${data.errcode}: ${data.errmsg}` };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * 验证凭证
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

  getConfigSchema() {
    return {
      appId: { type: 'string', label: '公众号 AppID', required: true },
      appSecret: { type: 'string', label: '公众号 AppSecret', required: true, sensitive: true },
      templateId: { type: 'string', label: '模板消息 ID', required: true },
      url: { type: 'string', label: '点击跳转链接', required: false },
    };
  },

  getRequiredFields() {
    return ['appId', 'appSecret', 'templateId'];
  },

  getSensitiveFields() {
    return ['appSecret'];
  },
};

export async function clearTokenCache() {
  try {
    await configKV.delete(ACCESS_TOKEN_KEY);
  } catch {
    // 忽略错误
  }
}
