/**
 * 响应包装中间件
 */

import type { Context, Next } from 'koa';
import { ErrorCodes } from '../types/index.js';

/**
 * 统一响应格式中间件
 * 自动将响应体包装为 { code, message, data } 格式
 */
export async function responseWrapper(ctx: Context, next: Next): Promise<void> {
  await next();

  // 如果响应体已经是标准格式（有 code 和 message 字段），不再包装
  if (ctx.body && typeof ctx.body === 'object' && 'code' in ctx.body && 'message' in ctx.body) {
    return;
  }

  // 204 No Content 不需要包装
  if (ctx.status === 204) {
    return;
  }

  // XML 响应不包装（微信消息回复）
  const contentType = ctx.type || ctx.response.get('Content-Type') || '';
  if (contentType.includes('xml')) {
    return;
  }

  // 纯文本响应不包装（微信验证 echostr）
  if (typeof ctx.body === 'string' && !ctx.body.startsWith('{')) {
    return;
  }

  // 包装成功响应
  if (ctx.body !== undefined) {
    ctx.body = {
      code: ErrorCodes.SUCCESS,
      message: 'success',
      data: ctx.body,
    };
  }
}

/**
 * 成功响应辅助函数
 */
export function success<T>(data: T, message = 'success') {
  return {
    code: ErrorCodes.SUCCESS,
    message,
    data,
  };
}

/**
 * 分页响应辅助函数
 */
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return {
    code: ErrorCodes.SUCCESS,
    message: 'success',
    data: {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  };
}
