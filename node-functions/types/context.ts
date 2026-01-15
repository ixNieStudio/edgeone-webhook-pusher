/**
 * Koa Context 类型扩展
 */

import type { Context, DefaultState } from 'koa';

/**
 * 扩展 Koa State 类型
 * 用于存储请求级别的数据（如认证信息）
 */
export interface AppState extends DefaultState {
  adminToken?: string;
  requestId?: string;
}

/**
 * 扩展后的 Koa Context 类型
 */
export interface AppContext extends Context {
  state: AppState;
  // 添加 request.body 类型支持
  request: Context['request'] & {
    body?: unknown;
  };
}
