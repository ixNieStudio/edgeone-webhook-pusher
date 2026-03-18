/**
 * Auth profile API.
 */

import type { ApiResponse, AuthProfileDetail, AuthProfileMaintenanceStatus, AuthProfileSummary } from '~/types';
import { useRequest } from './useRequest';

export function useAuthProfileApi() {
  const { get, post, put } = useRequest();

  function getAuthProfiles(): Promise<ApiResponse<AuthProfileSummary[]>> {
    return get<AuthProfileSummary[]>('/settings/auth-profiles');
  }

  function getAuthProfileDetail(id: string): Promise<ApiResponse<AuthProfileDetail>> {
    return get<AuthProfileDetail>(`/settings/auth-profiles/${id}`);
  }

  function verifyAuthProfile(id: string): Promise<ApiResponse<AuthProfileMaintenanceStatus>> {
    return post<AuthProfileMaintenanceStatus>(`/settings/auth-profiles/${id}/verify`);
  }

  function createAuthProfile(data: {
    name: string;
    type: 'wechat' | 'work_wechat';
    config: Record<string, unknown>;
  }): Promise<ApiResponse<AuthProfileSummary>> {
    return post<AuthProfileSummary>('/settings/auth-profiles', data);
  }

  function updateAuthProfile(
    id: string,
    data: {
      name?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<AuthProfileSummary>> {
    return put<AuthProfileSummary>(`/settings/auth-profiles/${id}`, data);
  }

  return {
    getAuthProfiles,
    getAuthProfileDetail,
    verifyAuthProfile,
    createAuthProfile,
    updateAuthProfile,
  };
}
