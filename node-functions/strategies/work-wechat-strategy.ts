/**
 * WorkWeChatStrategy - 企业微信渠道策略
 * 
 * 实现企业微信的消息发送逻辑
 */

import { BaseChannelStrategy } from './base-channel-strategy.js';
import type { Channel, WorkWeChatConfig } from '../types/channel.js';
import type { PushMessage, SendResult, ChannelCapability } from './types.js';
import { ChannelCapability as ChannelCapabilityEnum } from './types.js';
import { configKV } from '../shared/kv-client.js';

// Access token cache TTL (2 hours, token valid for ~2h)
const ACCESS_TOKEN_TTL = 7000; // slightly less than 2 hours

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface WorkWeChatAPIResponse {
  errcode: number;
  errmsg: string;
  access_token?: string;
  expires_in?: number;
  msgid?: string;
  invaliduser?: string;
  invalidparty?: string;
  invalidtag?: string;
}

export class WorkWeChatStrategy extends BaseChannelStrategy {
  private config: WorkWeChatConfig;
  
  // 企业微信消息长度限制（2048字符）
  private static readonly MAX_MESSAGE_LENGTH = 2048;

  constructor(channel: Channel) {
    super(channel);
    this.config = channel.config as WorkWeChatConfig;
    this.validateConfig();
  }
  
  /**
   * 验证企业微信配置
   * 验证必需字段（corpId、agentId、corpSecret）
   */
  private validateConfig(): void {
    if (!this.config.corpId) {
      throw new Error('Missing required config: corpId');
    }
    if (!this.config.agentId) {
      throw new Error('Missing required config: agentId');
    }
    if (!this.config.corpSecret) {
      throw new Error('Missing required config: corpSecret');
    }
  }
  
  /**
   * 转义特殊字符
   * 转义 HTML 特殊字符以防止格式问题
   */
  private escapeSpecialChars(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  /**
   * 限制消息长度并截断
   * 如果消息超过最大长度，自动截断并添加省略标记
   */
  private truncateMessage(text: string): string {
    if (text.length <= WorkWeChatStrategy.MAX_MESSAGE_LENGTH) {
      return text;
    }
    
    const truncated = text.substring(0, WorkWeChatStrategy.MAX_MESSAGE_LENGTH - 3);
    return `${truncated}...`;
  }
  
  /**
   * 处理消息内容
   * 应用特殊字符转义和长度限制
   */
  private processMessageContent(text: string): string {
    const escaped = this.escapeSpecialChars(text);
    return this.truncateMessage(escaped);
  }

  /**
   * 获取渠道能力类型
   */
  getChannelCapability(): ChannelCapability {
    return ChannelCapabilityEnum.TOKEN_MANAGED;
  }

  /**
   * 获取企业微信 Access Token（带缓存）
   * 实现 token 获取和缓存逻辑，支持自动刷新
   */
  protected async getAccessToken(): Promise<string> {
    const cacheKey = `work_wechat_token:${this.config.corpId}:${this.config.agentId}`;

    // 尝试从缓存获取
    const cached = await configKV.get<TokenCache>(cacheKey);
    if (cached?.accessToken && cached?.expiresAt > Date.now()) {
      return cached.accessToken;
    }

    // 请求新 token
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.config.corpId}&corpsecret=${this.config.corpSecret}`;
    const response = await fetch(url);
    const data = (await response.json()) as WorkWeChatAPIResponse;

    if (data.errcode !== 0) {
      throw new Error(`Failed to get access token: ${data.errmsg} (errcode: ${data.errcode})`);
    }

    if (!data.access_token || !data.expires_in) {
      throw new Error('Invalid access token response from WorkWeChat API');
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
   * 构建企业微信消息体
   * 支持用户ID和部门ID两种目标类型
   * 支持文本消息和模板卡片消息格式
   */
  protected buildMessage(message: PushMessage, target: string): any {
    // 判断 target 是用户ID还是部门ID
    // 部门ID以 'dept_' 前缀标识
    const isUser = !target.startsWith('dept_');
    
    // 构建消息内容（应用特殊字符转义和长度限制）
    const content = message.desp
      ? `${message.title}\n\n${message.desp}`
      : message.title;
    const processedContent = this.processMessageContent(content);

    return {
      touser: isUser ? target : undefined,
      toparty: !isUser ? target.replace('dept_', '') : undefined,
      msgtype: 'text',
      agentid: this.config.agentId,
      text: {
        content: processedContent,
      },
    };
  }

  /**
   * 发送企业微信消息
   * 调用企业微信 API 发送消息，支持 Token 失效自动重试
   */
  protected async sendRequest(token: string, messageBody: any): Promise<SendResult> {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageBody),
    });

    const data = (await response.json()) as WorkWeChatAPIResponse;

    // Token 失效（40014: invalid access_token, 42001: access_token expired），重试一次
    if (data.errcode === 40014 || data.errcode === 42001) {
      // 清除缓存并重新获取 token
      const cacheKey = `work_wechat_token:${this.config.corpId}:${this.config.agentId}`;
      await configKV.delete(cacheKey);
      
      const newToken = await this.getAccessToken();
      const retryUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${newToken}`;
      const retryResponse = await fetch(retryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody),
      });
      
      const retryData = (await retryResponse.json()) as WorkWeChatAPIResponse;
      return this.parseResponse(retryData);
    }

    return this.parseResponse(data);
  }

  /**
   * 解析企业微信 API 响应
   * 企业微信的响应格式与微信类似，但字段略有不同
   */
  protected parseResponse(response: WorkWeChatAPIResponse): SendResult {
    return {
      success: response.errcode === 0,
      msgId: response.msgid,
      error: response.errmsg,
      errorCode: response.errcode,
    };
  }
}
