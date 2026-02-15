/**
 * 初始化 API
 */

import type { ApiResponse, InitStatus, InitResult, ValidateTokenResult } from '~/types';
import { useRequest } from './useRequest';

export function useInitApi() {
  const { get, post } = useRequest();

  /**
   * 获取初始化状态
   */
  function getInitStatus(): Promise<ApiResponse<InitStatus>> {
    return get<InitStatus>('/init/status', false);
  }

  /**
   * 执行初始化
   */
  function doInit(): Promise<ApiResponse<InitResult>> {
    return post<InitResult>('/init', undefined, false);
  }

  /**
   * 验证 Admin Token
   */
  async function validateToken(token: string): Promise<ApiResponse<ValidateTokenResult>> {
    try {
      const res = await fetch('/v1/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return res.json();
    } catch {
      return { code: -1, message: '验证失败', data: { valid: false } };
    }
  }

  return {
    getInitStatus,
    doInit,
    validateToken,
  };
}
