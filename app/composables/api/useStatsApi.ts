/**
 * Stats API
 */

import type { ApiResponse } from '~/types';
import type { StatsData } from '~/types/frontend';
import { useRequest } from './useRequest';

export function useStatsApi() {
  const { get } = useRequest();

  /**
   * 获取统计数据
   */
  function getStats(): Promise<ApiResponse<StatsData>> {
    return get<StatsData>('/stats');
  }

  return {
    getStats,
  };
}
