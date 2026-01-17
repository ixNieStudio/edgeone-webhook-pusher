/**
 * Demo Apps API Composable
 * Feature: demo-mode
 * 
 * 体验应用 API 客户端，无需认证
 */

import type { ApiResponse, AppWithCount, CreateBindCodeResponse, BindCodeStatusResponse } from '~/types';

export interface DemoAppCreateInput {
  name: string;
  pushMode: 'single' | 'subscribe';
}

export interface DemoAppWithInfo extends AppWithCount {
  daysRemaining?: number;
}

export function useDemoApps() {
  const config = useRuntimeConfig();
  const baseURL = '/v1';

  /**
   * 发送请求（不带认证）
   */
  async function request<T>(
    method: string,
    url: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response = await $fetch<T>(`${baseURL}${url}`, {
        method,
        body: data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || '请求失败',
      };
    }
  }

  /**
   * 获取体验应用列表
   */
  function list(): Promise<ApiResponse<DemoAppWithInfo[]>> {
    return request<DemoAppWithInfo[]>('GET', '/demo/apps');
  }

  /**
   * 创建体验应用
   */
  function create(data: DemoAppCreateInput): Promise<ApiResponse<DemoAppWithInfo>> {
    return request<DemoAppWithInfo>('POST', '/demo/apps', data);
  }

  /**
   * 获取体验应用详情
   */
  function getById(id: string): Promise<ApiResponse<DemoAppWithInfo>> {
    return request<DemoAppWithInfo>('GET', `/demo/apps/${id}`);
  }

  /**
   * 删除体验应用
   */
  function deleteApp(id: string): Promise<ApiResponse<void>> {
    return request<void>('DELETE', `/demo/apps/${id}`);
  }

  /**
   * 生成绑定码
   */
  function generateBindCode(appId: string): Promise<ApiResponse<CreateBindCodeResponse>> {
    return request<CreateBindCodeResponse>('POST', `/demo/apps/${appId}/bindcode`, {});
  }

  /**
   * 查询绑定码状态
   */
  function getBindCodeStatus(appId: string, code: string): Promise<ApiResponse<BindCodeStatusResponse>> {
    return request<BindCodeStatusResponse>('GET', `/demo/apps/${appId}/bindcode/${code}`);
  }

  return {
    list,
    create,
    getById,
    deleteApp,
    generateBindCode,
    getBindCodeStatus,
  };
}
