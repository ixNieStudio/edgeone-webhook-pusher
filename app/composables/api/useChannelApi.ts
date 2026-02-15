/**
 * 渠道 API
 */

import type { ApiResponse, Channel, CreateChannelInput, UpdateChannelInput } from '~/types';
import { useRequest } from './useRequest';

/**
 * Token 维护状态
 */
export interface TokenStatus {
  valid: boolean;
  lastRefreshAt: number;
  lastRefreshSuccess: boolean;
  expiresAt?: number;
  error?: string;
  errorCode?: number;
}

export function useChannelApi() {
  const { get, post, put, del } = useRequest();

  /**
   * 获取渠道列表
   */
  function getChannels(): Promise<ApiResponse<Channel[]>> {
    return get<Channel[]>('/channels');
  }

  /**
   * 获取渠道详情
   */
  function getChannel(id: string): Promise<ApiResponse<Channel>> {
    return get<Channel>(`/channels/${id}`);
  }

  /**
   * 创建渠道
   */
  function createChannel(data: CreateChannelInput): Promise<ApiResponse<Channel>> {
    return post<Channel>('/channels', data);
  }

  /**
   * 更新渠道
   */
  function updateChannel(id: string, data: UpdateChannelInput): Promise<ApiResponse<Channel>> {
    return put<Channel>(`/channels/${id}`, data);
  }

  /**
   * 删除渠道
   */
  function deleteChannel(id: string): Promise<ApiResponse<void>> {
    return del<void>(`/channels/${id}`);
  }

  /**
   * 验证渠道配置
   */
  function verifyChannel(id: string): Promise<ApiResponse<{ valid: boolean }>> {
    return get<{ valid: boolean }>(`/channels/${id}/verify`);
  }

  /**
   * 获取渠道 Token 维护状态
   */
  function getChannelTokenStatus(id: string): Promise<ApiResponse<TokenStatus>> {
    return get<TokenStatus>(`/channels/${id}/token-status`);
  }

  return {
    getChannels,
    getChannel,
    createChannel,
    updateChannel,
    deleteChannel,
    verifyChannel,
    getChannelTokenStatus,
  };
}
