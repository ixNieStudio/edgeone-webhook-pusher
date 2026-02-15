/**
 * OpenID API（嵌套在 App 下）
 */

import type { ApiResponse, OpenID, CreateOpenIDInput, UpdateOpenIDInput } from '~/types';
import { useRequest } from './useRequest';

export function useOpenIdApi() {
  const { get, post, put, del } = useRequest();

  /**
   * 获取应用下的 OpenID 列表
   */
  function getAppOpenIds(appId: string): Promise<ApiResponse<OpenID[]>> {
    return get<OpenID[]>(`/apps/${appId}/openids`);
  }

  /**
   * 获取 OpenID 详情
   */
  function getAppOpenId(appId: string, openIdId: string): Promise<ApiResponse<OpenID>> {
    return get<OpenID>(`/apps/${appId}/openids/${openIdId}`);
  }

  /**
   * 添加 OpenID
   */
  function createAppOpenId(appId: string, data: CreateOpenIDInput): Promise<ApiResponse<OpenID>> {
    return post<OpenID>(`/apps/${appId}/openids`, data);
  }

  /**
   * 更新 OpenID
   */
  function updateAppOpenId(appId: string, openIdId: string, data: UpdateOpenIDInput): Promise<ApiResponse<OpenID>> {
    return put<OpenID>(`/apps/${appId}/openids/${openIdId}`, data);
  }

  /**
   * 删除 OpenID
   */
  function deleteAppOpenId(appId: string, openIdId: string): Promise<ApiResponse<void>> {
    return del<void>(`/apps/${appId}/openids/${openIdId}`);
  }

  return {
    getAppOpenIds,
    getAppOpenId,
    createAppOpenId,
    updateAppOpenId,
    deleteAppOpenId,
  };
}
