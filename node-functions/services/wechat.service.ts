/**
 * WeChat Service
 * 
 * Handles WeChat API interactions including access token management
 * and user follow status checking.
 */

import { configKV } from '../shared/kv-client.js';
import { configService } from './config.service.js';

// Access token cache key and TTL (2 hours, token valid for ~2h)
const ACCESS_TOKEN_KEY = 'wechat_access_token';
const ACCESS_TOKEN_TTL = 7000; // slightly less than 2 hours

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface WeChatResponse {
  errcode?: number;
  errmsg?: string;
  access_token?: string;
  expires_in?: number;
}

interface WeChatUserInfo {
  openid: string;
  nickname?: string;
  subscribe: number;
  errcode?: number;
  errmsg?: string;
}

/**
 * Get WeChat access token (cached in KV)
 */
export async function getAccessToken(): Promise<string | null> {
  // Try to get from cache
  const cached = await configKV.get<TokenCache>(ACCESS_TOKEN_KEY);
  if (cached?.accessToken && cached?.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  // Get WeChat config
  const wechatConfig = await configService.getWeChatConfig();
  if (!wechatConfig?.appId || !wechatConfig?.appSecret) {
    console.error('WeChat config not found');
    return null;
  }

  // Fetch new access token
  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wechatConfig.appId}&secret=${wechatConfig.appSecret}`;
    const res = await fetch(url);
    const data = (await res.json()) as WeChatResponse;

    if (data.errcode) {
      console.error('Failed to get access token:', data);
      return null;
    }

    if (!data.access_token || !data.expires_in) {
      return null;
    }

    const tokenData: TokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 5 min buffer
    };

    // Cache in KV
    await configKV.put(ACCESS_TOKEN_KEY, tokenData, ACCESS_TOKEN_TTL);

    return data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error);
    return null;
  }
}

/**
 * Check if user has followed the official account
 */
export async function checkUserFollowStatus(openId: string): Promise<{ subscribed: boolean; nickname?: string }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { subscribed: false };
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openId}&lang=zh_CN`;
    const res = await fetch(url);
    const data = (await res.json()) as WeChatUserInfo;

    if (data.errcode) {
      console.error('Failed to get user info:', data);
      return { subscribed: false };
    }

    return {
      subscribed: data.subscribe === 1,
      nickname: data.nickname || undefined,
    };
  } catch (error) {
    console.error('Error checking follow status:', error);
    return { subscribed: false };
  }
}

/**
 * Get user info from WeChat
 */
export async function getUserInfo(openId: string): Promise<{ openId: string; nickname?: string; subscribed: boolean } | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openId}&lang=zh_CN`;
    const res = await fetch(url);
    const data = (await res.json()) as WeChatUserInfo;

    if (data.errcode) {
      console.error('Failed to get user info:', data);
      return null;
    }

    return {
      openId: data.openid,
      nickname: data.nickname || undefined,
      subscribed: data.subscribe === 1,
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

export const wechatService = {
  getAccessToken,
  checkUserFollowStatus,
  getUserInfo,
};
