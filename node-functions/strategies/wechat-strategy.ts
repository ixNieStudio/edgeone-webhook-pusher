/**
 * WeChatStrategy - 微信公众号渠道策略
 * 
 * 实现微信公众号的消息发送逻辑
 */

import { BaseChannelStrategy } from './base-channel-strategy.js';
import type { Channel, WeChatConfig } from '../types/channel.js';
import type { PushMessage, SendResult, ChannelCapability } from './types.js';
import { ChannelCapability as ChannelCapabilityEnum } from './types.js';
import { configKV } from '../shared/kv-client.js';

// Access token cache TTL (2 hours, token valid for ~2h)
const ACCESS_TOKEN_TTL = 7000; // slightly less than 2 hours

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface WeChatAPIResponse {
  errcode?: number;
  errmsg?: string;
  access_token?: string;
  expires_in?: number;
  msgid?: number;
}

export class WeChatStrategy extends BaseChannelStrategy {
  private config: WeChatConfig;

  constructor(channel: Channel) {
    super(channel);
    this.config = channel.config as WeChatConfig;
  }

  /**
   * 获取渠道能力类型
   */
  getChannelCapability(): ChannelCapability {
    return ChannelCapabilityEnum.TOKEN_MANAGED;
  }

  /**
   * 获取微信 Access Token（带缓存）
   * 实现 token 获取和缓存逻辑，支持自动刷新
   */
  protected async getAccessToken(): Promise<string> {
    const cacheKey = `wechat_token:${this.config.appId}`;

    // 尝试从缓存获取
    const cached = await configKV.get<TokenCache>(cacheKey);
    if (cached?.accessToken && cached?.expiresAt > Date.now()) {
      return cached.accessToken;
    }

    // 请求新 token
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`;
    const response = await fetch(url);
    const data = (await response.json()) as WeChatAPIResponse;

    if (data.errcode) {
      throw new Error(`Failed to get access token: ${data.errmsg} (errcode: ${data.errcode})`);
    }

    if (!data.access_token || !data.expires_in) {
      throw new Error('Invalid access token response from WeChat API');
    }

    // 缓存 token（提前 5 分钟过期以避免边界情况）
    const expiresAt = Date.now() + (data.expires_in - 300) * 1000;
    const tokenData: TokenCache = {
      accessToken: data.access_token,
      expiresAt,
    };
    await configKV.put(cacheKey, tokenData, ACCESS_TOKEN_TTL);

    return data.access_token;
  }

  /**
   * 构建微信消息体
   * 支持客服消息和模板消息两种格式
   */
  protected buildMessage(message: PushMessage, openId: string): any {
    if (message.templateId) {
      // 模板消息
      return {
        touser: openId,
        template_id: message.templateId,
        data: message.templateData || {
          first: { value: message.title },
          keyword1: { value: message.desp || '' },
          remark: { value: '' },
        },
      };
    } else {
      // 客服消息
      const content = message.desp
        ? `${message.title}\n\n${message.desp}`
        : message.title;
      return {
        touser: openId,
        msgtype: 'text',
        text: { content },
      };
    }
  }

  /**
   * 发送微信消息
   * 调用微信 API 发送消息，支持 Token 失效自动重试
   */
  protected async sendRequest(token: string, messageBody: any): Promise<SendResult> {
    const isTemplate = !!messageBody.template_id;
    const endpoint = isTemplate
      ? 'message/template/send'
      : 'message/custom/send';

    const url = `https://api.weixin.qq.com/cgi-bin/${endpoint}?access_token=${token}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageBody),
    });

    const data = (await response.json()) as WeChatAPIResponse;

    // Token 失效（40001: invalid credential, 42001: access_token expired），重试一次
    if (data.errcode === 40001 || data.errcode === 42001) {
      // 清除缓存并重新获取 token
      const cacheKey = `wechat_token:${this.config.appId}`;
      await configKV.delete(cacheKey);
      
      const newToken = await this.getAccessToken();
      const retryUrl = `https://api.weixin.qq.com/cgi-bin/${endpoint}?access_token=${newToken}`;
      const retryResponse = await fetch(retryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody),
      });
      
      return this.parseResponse(await retryResponse.json());
    }

    return this.parseResponse(data);
  }
}
