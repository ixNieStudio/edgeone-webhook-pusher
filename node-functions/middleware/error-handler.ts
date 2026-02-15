/**
 * 统一错误处理中间件
 */

import type { Context, Next } from 'koa';
import { ApiError, ErrorCodes, ErrorMessages, getHttpStatus } from '../types/index.js';

/**
 * 错误处理中间件
 * 捕获所有错误并返回统一格式的错误响应
 */
export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err) {
    console.error('[Error]', err);

    if (err instanceof ApiError) {
      ctx.status = err.statusCode;
      ctx.body = {
        code: err.code,
        message: err.message,
        data: null,
      };
      return;
    }

    // Koa 内置错误 (ctx.throw)
    if (err && typeof err === 'object' && 'status' in err) {
      const koaError = err as { status: number; message?: string };
      const status = koaError.status || 500;
      const code = status === 404 ? ErrorCodes.KEY_NOT_FOUND :
                   status === 401 ? ErrorCodes.UNAUTHORIZED :
                   status === 400 ? ErrorCodes.INVALID_PARAM :
                   ErrorCodes.INTERNAL_ERROR;
      
      ctx.status = status;
      ctx.body = {
        code,
        message: koaError.message || ErrorMessages[code] || 'Unknown error',
        data: null,
      };
      return;
    }

    // 未知错误
    ctx.status = 500;
    ctx.body = {
      code: ErrorCodes.INTERNAL_ERROR,
      message: err instanceof Error ? err.message : 'Internal server error',
      data: null,
    };
  }
}
