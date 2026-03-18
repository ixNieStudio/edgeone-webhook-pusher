/**
 * Work WeChat token maintenance helpers.
 */

import { configKV } from '../shared/kv-client.js';
import type { Channel, WorkWeChatConfig } from '../types/channel.js';
import { KVKeys } from '../types/constants.js';

const ACCESS_TOKEN_TTL = 7000;
const TOKEN_STATUS_TTL = 86400;
const TOKEN_REFRESH_BUFFER_MS = 15 * 60 * 1000;
const FAILED_STATUS_RETRY_MS = 5 * 60 * 1000;

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface WorkWeChatAPIResponse {
  errcode: number;
  errmsg: string;
  access_token?: string;
  expires_in?: number;
}

export interface WorkWeChatTokenStatus {
  valid: boolean;
  lastRefreshAt: number;
  lastRefreshSuccess: boolean;
  expiresAt?: number;
  error?: string;
  errorCode?: number;
}

function ensureWorkWeChatChannel(channel: Channel): WorkWeChatConfig {
  if (channel.type !== 'work_wechat') {
    throw new Error('Channel must be of type work_wechat');
  }

  return channel.config as WorkWeChatConfig;
}

function ensureRequiredConfig(config: WorkWeChatConfig) {
  if (!config.corpId) {
    throw new Error('Missing required config: corpId');
  }

  if (!config.agentId) {
    throw new Error('Missing required config: agentId');
  }

  if (!config.corpSecret) {
    throw new Error('Missing required config: corpSecret');
  }
}

function getAccessTokenCacheKey(channel: Channel) {
  const config = ensureWorkWeChatChannel(channel);
  return KVKeys.WORK_WECHAT_TOKEN(config.corpId, String(config.agentId));
}

function getTokenStatusCacheKey(channelId: string) {
  return KVKeys.WORK_WECHAT_TOKEN_STATUS(channelId);
}

function formatWorkWeChatErrorMessage(data: WorkWeChatAPIResponse) {
  return data.errmsg
    ? `${data.errmsg} (errcode: ${data.errcode})`
    : `企业微信 API 错误: ${data.errcode}`;
}

function formatWorkWeChatAccessTokenError(data: WorkWeChatAPIResponse) {
  return `Failed to get access token: ${formatWorkWeChatErrorMessage(data)}`;
}

async function updateTokenStatus(channelId: string, status: WorkWeChatTokenStatus): Promise<void> {
  await configKV.put(getTokenStatusCacheKey(channelId), status, TOKEN_STATUS_TTL);

  try {
    const { adminIndexService } = await import('./admin-index.service.js');
    await adminIndexService.syncAuthProfileById(channelId);
  } catch {
    // 摘要索引更新失败不应阻断 token 状态写入
  }
}

async function getTokenStatus(channelId: string): Promise<WorkWeChatTokenStatus | null> {
  return configKV.get<WorkWeChatTokenStatus>(getTokenStatusCacheKey(channelId));
}

function shouldMaintainTokenStatus(status: WorkWeChatTokenStatus | null, nowTs = Date.now()) {
  if (!status || status.lastRefreshAt <= 0) {
    return true;
  }

  if (!status.lastRefreshSuccess || !status.valid) {
    return nowTs - status.lastRefreshAt >= FAILED_STATUS_RETRY_MS;
  }

  if (typeof status.expiresAt !== 'number') {
    return true;
  }

  return status.expiresAt - nowTs <= TOKEN_REFRESH_BUFFER_MS;
}

async function getAccessToken(channel: Channel, forceRefresh = false): Promise<string> {
  const config = ensureWorkWeChatChannel(channel);
  ensureRequiredConfig(config);

  const cacheKey = getAccessTokenCacheKey(channel);

  if (!forceRefresh) {
    const cached = await configKV.get<TokenCache>(cacheKey);
    if (cached?.accessToken && cached.expiresAt > Date.now()) {
      return cached.accessToken;
    }
  }

  let statusUpdated = false;

  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpId}&corpsecret=${config.corpSecret}`;
    const response = await fetch(url);
    const data = (await response.json()) as WorkWeChatAPIResponse;

    if (data.errcode !== 0) {
      const message = formatWorkWeChatAccessTokenError(data);
      await updateTokenStatus(channel.id, {
        valid: false,
        lastRefreshAt: Date.now(),
        lastRefreshSuccess: false,
        error: message,
        errorCode: data.errcode,
      });
      statusUpdated = true;
      throw new Error(message);
    }

    if (!data.access_token || !data.expires_in) {
      await updateTokenStatus(channel.id, {
        valid: false,
        lastRefreshAt: Date.now(),
        lastRefreshSuccess: false,
        error: '获取企业微信 Access Token 失败',
      });
      statusUpdated = true;
      throw new Error('Invalid access token response from WorkWeChat API');
    }

    const expiresAt = Date.now() + (data.expires_in - 300) * 1000;
    await configKV.put(cacheKey, {
      accessToken: data.access_token,
      expiresAt,
    } satisfies TokenCache, ACCESS_TOKEN_TTL);

    await updateTokenStatus(channel.id, {
      valid: true,
      lastRefreshAt: Date.now(),
      lastRefreshSuccess: true,
      expiresAt,
    });
    statusUpdated = true;

    return data.access_token;
  } catch (error) {
    if (statusUpdated) {
      throw error;
    }

    await updateTokenStatus(channel.id, {
      valid: false,
      lastRefreshAt: Date.now(),
      lastRefreshSuccess: false,
      error: '网络请求失败',
    });
    throw error instanceof Error ? error : new Error('网络请求失败');
  }
}

async function verifyChannelConfig(channel: Channel): Promise<{ valid: boolean; expiresIn?: number; error?: string; errorCode?: number }> {
  try {
    await getAccessToken(channel, true);
    const status = await getTokenStatus(channel.id);

    return {
      valid: true,
      expiresIn: status?.expiresAt ? Math.max(0, Math.floor((status.expiresAt - Date.now()) / 1000)) : undefined,
    };
  } catch (error) {
    const status = await getTokenStatus(channel.id);
    return {
      valid: false,
      error: status?.error || (error instanceof Error ? error.message : '验证失败'),
      errorCode: status?.errorCode,
    };
  }
}

async function ensureTokenMaintenance(channel: Channel): Promise<WorkWeChatTokenStatus | null> {
  const status = await getTokenStatus(channel.id);
  if (!shouldMaintainTokenStatus(status)) {
    return status;
  }

  await verifyChannelConfig(channel);
  return getTokenStatus(channel.id);
}

export const workWeChatMaintenanceService = {
  getAccessToken,
  getTokenStatus,
  verifyChannelConfig,
  ensureTokenMaintenance,
};
