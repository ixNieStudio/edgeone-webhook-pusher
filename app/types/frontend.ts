/**
 * 前端特有类型定义
 */

import type { App } from './app';
import type { DemoApp } from './demo-app';

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
  channelId?: string;
  appId?: string;
  openId?: string;
  direction?: 'inbound' | 'outbound';
  startDate?: string;
  endDate?: string;
}

/**
 * App 带订阅者数量（后端 GET /apps 和 GET /apps/:id 返回）
 */
export type AppWithCount = App & {
  openIdCount: number;
};

/**
 * DemoApp 带额外信息（剩余天数、订阅者数量）
 */
export type DemoAppWithInfo = DemoApp & {
  daysRemaining?: number;
  openIdCount: number;
};
