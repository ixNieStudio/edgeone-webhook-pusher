/**
 * 基础请求封装
 * 处理认证、错误和 401 跳转
 */

import type { ApiResponse } from '~/types';
import { useAuthStore } from '~/stores/auth';

const API_BASE = '/v1';

export function useRequest() {
  const auth = useAuthStore();
  const router = useRouter();

  /**
   * 通用请求方法
   */
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    requireAuth = true
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      Object.assign(headers, auth.getAuthHeader());
    }

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle 204 No Content
      if (res.status === 204) {
        return { code: 0, message: 'success', data: null as T };
      }

      // Handle 401 - redirect to login
      if (res.status === 401) {
        auth.logout();
        router.push('/login');
        return { code: 401, message: '未授权，请重新登录', data: null as T };
      }

      const data = await res.json();
      return data as ApiResponse<T>;
    } catch (error) {
      return {
        code: -1,
        message: error instanceof Error ? error.message : '网络请求失败',
        data: null as T,
      };
    }
  }

  /**
   * GET 请求
   */
  async function get<T>(path: string, requireAuth = true): Promise<ApiResponse<T>> {
    return request<T>('GET', path, undefined, requireAuth);
  }

  /**
   * POST 请求
   */
  async function post<T>(path: string, body?: unknown, requireAuth = true): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body, requireAuth);
  }

  /**
   * PUT 请求
   */
  async function put<T>(path: string, body?: unknown, requireAuth = true): Promise<ApiResponse<T>> {
    return request<T>('PUT', path, body, requireAuth);
  }

  /**
   * DELETE 请求
   */
  async function del<T>(path: string, requireAuth = true): Promise<ApiResponse<T>> {
    return request<T>('DELETE', path, undefined, requireAuth);
  }

  return {
    request,
    get,
    post,
    put,
    del,
  };
}
