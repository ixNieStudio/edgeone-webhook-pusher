/**
 * 前端特有类型定义
 */

import type { Message, DeliveryResult } from './message';

/**
 * 统计数据
 */
export interface StatsData {
  channels: number;
  apps: number;
  openIds: number;
  messages: number;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

/**
 * 消息查询参数
 */
export interface MessageQueryParams extends PaginationParams {
  appId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * App 带订阅者数量
 */
export interface AppWithCount {
  id: string;
  name: string;
  channelId: string;
  sendKey: string;
  openIdCount: number;
  createdAt: string;
  updatedAt: string;
}
