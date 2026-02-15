/**
 * 应用 API
 */

import type { ApiResponse, App, CreateAppInput, UpdateAppInput, AppWithCount, CreateBindCodeResponse, BindCodeStatusResponse } from '~/types';
import { useRequest } from './useRequest';

export function useAppApi() {
  const { get, post, put, del } = useRequest();

  /**
   * 获取应用列表（带 openIdCount）
   */
  function getApps(): Promise<ApiResponse<AppWithCount[]>> {
    return get<AppWithCount[]>('/apps');
  }

  /**
   * 获取应用详情（带 openIdCount）
   */
  function getApp(id: string): Promise<ApiResponse<AppWithCount>> {
    return get<AppWithCount>(`/apps/${id}`);
  }

  /**
   * 创建应用
   */
  function createApp(data: CreateAppInput): Promise<ApiResponse<App>> {
    return post<App>('/apps', data);
  }

  /**
   * 更新应用
   */
  function updateApp(id: string, data: UpdateAppInput): Promise<ApiResponse<App>> {
    return put<App>(`/apps/${id}`, data);
  }

  /**
   * 删除应用
   */
  function deleteApp(id: string): Promise<ApiResponse<void>> {
    return del<void>(`/apps/${id}`);
  }

  /**
   * 生成绑定码
   */
  function generateBindCode(appId: string): Promise<ApiResponse<CreateBindCodeResponse>> {
    return post<CreateBindCodeResponse>(`/apps/${appId}/bindcode`, {});
  }

  /**
   * 查询绑定码状态
   */
  function getBindCodeStatus(appId: string, code: string): Promise<ApiResponse<BindCodeStatusResponse>> {
    return get<BindCodeStatusResponse>(`/apps/${appId}/bindcode/${code}`);
  }

  return {
    getApps,
    getApp,
    createApp,
    updateApp,
    deleteApp,
    generateBindCode,
    getBindCodeStatus,
  };
}
