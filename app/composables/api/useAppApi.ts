/**
 * App-first admin API.
 */

import type {
  ApiResponse,
  AppDeliveryConfig,
  AppRecipientView,
  CreateManagedAppInput,
  ManagedAppLiteDetail,
  ManagedAppSummary,
  IndexRepairResponse,
  SetupOverview,
  UpdateManagedAppInput,
  PushResult,
  BindCodeStatusResponse,
  CreateBindCodeResponse,
} from '~/types';
import { useRequest } from './useRequest';

export function useAppApi() {
  const { get, post, put, del } = useRequest();

  function getApps(): Promise<ApiResponse<ManagedAppSummary[]>> {
    return get<ManagedAppSummary[]>('/apps');
  }

  function getApp(id: string): Promise<ApiResponse<ManagedAppLiteDetail>> {
    return get<ManagedAppLiteDetail>(`/apps/${id}`);
  }

  function createApp(data: CreateManagedAppInput): Promise<ApiResponse<ManagedAppLiteDetail>> {
    return post<ManagedAppLiteDetail>('/apps', data);
  }

  function updateApp(id: string, data: UpdateManagedAppInput): Promise<ApiResponse<ManagedAppLiteDetail>> {
    return put<ManagedAppLiteDetail>(`/apps/${id}`, data);
  }

  function deleteApp(id: string): Promise<ApiResponse<void>> {
    return del<void>(`/apps/${id}`);
  }

  function getAppConfig(id: string): Promise<ApiResponse<AppDeliveryConfig>> {
    return get<AppDeliveryConfig>(`/apps/${id}/config`);
  }

  function updateAppConfig(id: string, data: UpdateManagedAppInput): Promise<ApiResponse<ManagedAppLiteDetail>> {
    return put<ManagedAppLiteDetail>(`/apps/${id}/config`, data);
  }

  function getAppRecipients(appId: string): Promise<ApiResponse<AppRecipientView[]>> {
    return get<AppRecipientView[]>(`/apps/${appId}/recipients`);
  }

  function generateBindCode(appId: string): Promise<ApiResponse<CreateBindCodeResponse>> {
    return post<CreateBindCodeResponse>(`/apps/${appId}/recipients/bind`, {});
  }

  function getBindCodeStatus(appId: string, code: string): Promise<ApiResponse<BindCodeStatusResponse>> {
    return get<BindCodeStatusResponse>(`/apps/${appId}/recipients/bind/${code}`);
  }

  function deleteRecipient(appId: string, recipientId: string): Promise<ApiResponse<void>> {
    return del<void>(`/apps/${appId}/recipients/${encodeURIComponent(recipientId)}`);
  }

  function testSend(
    appId: string,
    data: {
      title: string;
      desp?: string;
      content?: string;
      type?: 'text' | 'page';
      format?: 'text' | 'markdown' | 'html';
      url?: string;
      summary?: string;
      short?: string;
      template?: string;
    }
  ): Promise<ApiResponse<PushResult>> {
    return post<PushResult>(`/apps/${appId}/test-send`, data);
  }

  function getSetupOverview(): Promise<ApiResponse<SetupOverview>> {
    return get<SetupOverview>('/setup/overview');
  }

  function getChannelCapabilities(): Promise<ApiResponse<Record<string, unknown>>> {
    return get<Record<string, unknown>>('/channel-capabilities');
  }

  function repairIndexes(domain: 'apps' | 'auth_profiles' | 'all'): Promise<ApiResponse<IndexRepairResponse>> {
    return post<IndexRepairResponse>('/settings/indexes/repair', { domain });
  }

  return {
    getApps,
    getApp,
    createApp,
    updateApp,
    deleteApp,
    getAppConfig,
    updateAppConfig,
    getAppRecipients,
    generateBindCode,
    getBindCodeStatus,
    deleteRecipient,
    testSend,
    getSetupOverview,
    getChannelCapabilities,
    repairIndexes,
  };
}
