/**
 * 配置 API
 */

import type { ApiResponse, SystemConfig, ResetTokenResult, ResetTokenRequest } from '~/types';
import { useRequest } from './useRequest';

export function useConfigApi() {
  const { get, put, post } = useRequest();

  /**
   * 获取系统配置
   */
  function getConfig(): Promise<ApiResponse<SystemConfig>> {
    return get<SystemConfig>('/config');
  }

  /**
   * 更新系统配置
   */
  function updateConfig(data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    return put<SystemConfig>('/config', data);
  }

  /**
   * 重置管理员令牌
   * @param newPassword - 可选：自定义密码
   * @param confirmPassword - 可选：确认密码
   */
  function resetAdminToken(
    newPassword?: string,
    confirmPassword?: string
  ): Promise<ApiResponse<ResetTokenResult>> {
    const payload: ResetTokenRequest = {};
    
    if (newPassword) {
      payload.newPassword = newPassword;
      payload.confirmPassword = confirmPassword;
    }
    
    return post<ResetTokenResult>('/config/reset-token', payload);
  }

  return {
    getConfig,
    updateConfig,
    resetAdminToken,
  };
}
