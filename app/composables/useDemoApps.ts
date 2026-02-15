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
  messageType?: 'text' | 'template';
}

export interface DemoAppWithInfo extends AppWithCount {
  daysRemaining?: number;
}

// Custom response type for demo apps composable
export interface DemoApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useDemoApps() {
  const config = useRuntimeConfig();
  const baseURL = '/v1';

  /**
   * 发送请求（不带认证）
   */
  async function request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<DemoApiResponse<T>> {
    try {
      const response = await $fetch<any>(`${baseURL}${url}`, {
        method,
        body: data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 后端使用 responseWrapper 中间件，返回格式为 { code, message, data }
      // 我们需要提取嵌套的 data 字段
      if (response && typeof response === 'object' && 'data' in response) {
        return {
          success: true,
          data: response.data as T,
        };
      }

      // 如果没有包装，直接返回
      return {
        success: true,
        data: response as T,
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
  function list(): Promise<DemoApiResponse<DemoAppWithInfo[]>> {
    return request<DemoAppWithInfo[]>('GET', '/demo/apps');
  }

  /**
   * 创建体验应用
   */
  function create(data: DemoAppCreateInput): Promise<DemoApiResponse<DemoAppWithInfo>> {
    return request<DemoAppWithInfo>('POST', '/demo/apps', data);
  }

  /**
   * 获取体验应用详情
   */
  function getById(id: string): Promise<DemoApiResponse<DemoAppWithInfo>> {
    return request<DemoAppWithInfo>('GET', `/demo/apps/${id}`);
  }

  /**
   * 删除体验应用
   */
  function deleteApp(id: string): Promise<DemoApiResponse<void>> {
    return request<void>('DELETE', `/demo/apps/${id}`);
  }

  /**
   * 生成绑定码
   */
  function generateBindCode(appId: string): Promise<DemoApiResponse<CreateBindCodeResponse>> {
    return request<CreateBindCodeResponse>('POST', `/demo/apps/${appId}/bindcode`, {});
  }

  /**
   * 查询绑定码状态
   */
  function getBindCodeStatus(appId: string, code: string): Promise<DemoApiResponse<BindCodeStatusResponse>> {
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
