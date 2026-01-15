/**
 * API Composable - 聚合所有 API
 * 
 * 统一导出所有 API 方法，保持向后兼容
 */

import { useInitApi } from './api/useInitApi';
import { useConfigApi } from './api/useConfigApi';
import { useChannelApi } from './api/useChannelApi';
import { useAppApi } from './api/useAppApi';
import { useOpenIdApi } from './api/useOpenIdApi';
import { useMessageApi } from './api/useMessageApi';
import { useStatsApi } from './api/useStatsApi';

export function useApi() {
  const initApi = useInitApi();
  const configApi = useConfigApi();
  const channelApi = useChannelApi();
  const appApi = useAppApi();
  const openIdApi = useOpenIdApi();
  const messageApi = useMessageApi();
  const statsApi = useStatsApi();

  return {
    // Init
    ...initApi,
    // Config
    ...configApi,
    // Channels
    ...channelApi,
    // Apps
    ...appApi,
    // OpenIDs
    ...openIdApi,
    // Messages
    ...messageApi,
    // Stats
    ...statsApi,
  };
}

// Re-export types for backward compatibility
export type {
  ApiResponse,
  Channel,
  CreateChannelInput,
  UpdateChannelInput,
  App,
  CreateAppInput,
  UpdateAppInput,
  OpenID,
  CreateOpenIDInput,
  UpdateOpenIDInput,
  Message,
  DeliveryResult,
  SystemConfig,
  StatsData,
  PaginatedResponse,
  MessageQueryParams,
} from '~/types';
