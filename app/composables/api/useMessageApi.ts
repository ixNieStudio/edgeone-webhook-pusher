/**
 * Message API
 */

import type { ApiResponse } from '~/types';
import type { MessageDetailView, MessageQueryParams, MessageWorkspaceResponse } from '~/types';
import { useRequest } from './useRequest';

export function useMessageApi() {
  const { get } = useRequest();

  /**
   * 获取消息历史列表
   */
  function getMessages(params?: MessageQueryParams): Promise<ApiResponse<MessageWorkspaceResponse>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.channelId) query.set('channelId', params.channelId);
    if (params?.appId) query.set('appId', params.appId);
    if (params?.openId) query.set('openId', params.openId);
    if (params?.direction) query.set('direction', params.direction);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const queryStr = query.toString();
    return get<MessageWorkspaceResponse>(`/messages${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * 获取消息详情
   */
  function getMessage(id: string): Promise<ApiResponse<MessageDetailView>> {
    return get<MessageDetailView>(`/messages/${id}`);
  }

  return {
    getMessages,
    getMessage,
  };
}
