/**
 * WeChat Service
 * Feature: frontend-admin-ui
 * 
 * Handles WeChat API interactions including access token management
 * and user follow status checking.
 */

import { configKV } from '../shared/kv-client.js';
import { configService } from './config.js';

// Access token cache key and TTL (2 hours, token valid for ~2h)
const ACCESS_TOKEN_KEY = 'wechat_access_token';
const ACCESS_TOKEN_TTL = 7000; // slightly less than 2 hours

/**
 * Get WeChat access token (cached in KV)
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  // Try to get from cache
  const cached = await configKV.get(ACCESS_TOKEN_KEY);
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
    const data = await res.json();

    if (data.errcode) {
      console.error('Failed to get access token:', data);
      return null;
    }

    const tokenData = {
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
 * @param {string} openId - User's OpenID
 * @returns {Promise<{subscribed: boolean, nickname?: string}>}
 */
export async function checkUserFollowStatus(openId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { subscribed: false };
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openId}&lang=zh_CN`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode) {
      console.error('Failed to get user info:', data);
      return { subscribed: false };
    }

    return {
      subscribed: data.subscribe === 1,
      nickname: data.nickname || null,
    };
  } catch (error) {
    console.error('Error checking follow status:', error);
    return { subscribed: false };
  }
}

/**
 * Get user info from WeChat
 * @param {string} openId - User's OpenID
 * @returns {Promise<{openId: string, nickname?: string, subscribed: boolean}|null>}
 */
export async function getUserInfo(openId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openId}&lang=zh_CN`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode) {
      console.error('Failed to get user info:', data);
      return null;
    }

    return {
      openId: data.openid,
      nickname: data.nickname || null,
      subscribed: data.subscribe === 1,
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}
