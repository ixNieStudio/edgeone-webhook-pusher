import type {
  ChannelAdapter,
  Message,
  ChannelDeliveryResult,
  ConfigSchema,
  WeChatTemplateConfig,
} from '../types/index.js';

// Access Token cache
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

/**
 * Get WeChat access token with caching
 */
async function getAccessToken(appId: string, appSecret: string): Promise<string> {
  const cacheKey = `${appId}:${appSecret}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode) {
    throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg}`);
  }

  if (!data.access_token || !data.expires_in) {
    throw new Error('Invalid WeChat API response');
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // Expire 5 min early
  });

  return data.access_token;
}

/**
 * WeChat Template Message Adapter
 */
export const wechatTemplateAdapter: ChannelAdapter = {
  type: 'wechat-template',
  name: '微信模板消息',

  async send(message: Message, credentials: Record<string, string>): Promise<ChannelDeliveryResult> {
    const config = credentials as unknown as WeChatTemplateConfig;

    try {
      const accessToken = await getAccessToken(config.appId, config.appSecret);

      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: config.openId,
          template_id: config.templateId,
          url: config.url,
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

      const data = (await res.json()) as {
        errcode: number;
        errmsg: string;
        msgid?: number;
      };

      if (data.errcode === 0) {
        return { success: true, externalId: String(data.msgid) };
      } else {
        return { success: false, error: `${data.errcode}: ${data.errmsg}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  async validate(credentials: Record<string, string>): Promise<boolean> {
    const config = credentials as unknown as WeChatTemplateConfig;

    if (!config.appId || !config.appSecret || !config.templateId || !config.openId) {
      return false;
    }

    try {
      await getAccessToken(config.appId, config.appSecret);
      return true;
    } catch {
      return false;
    }
  },

  getConfigSchema(): ConfigSchema {
    return {
      appId: { type: 'string', label: '公众号 AppID', required: true },
      appSecret: { type: 'string', label: '公众号 AppSecret', required: true, sensitive: true },
      templateId: { type: 'string', label: '模板消息 ID', required: true },
      openId: { type: 'string', label: '用户 OpenID', required: true },
      url: { type: 'string', label: '点击跳转链接', required: false },
    };
  },
};

/**
 * Clear token cache (for testing)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}
