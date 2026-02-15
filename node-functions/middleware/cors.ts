/**
 * CORS 中间件
 */

import type { Context, Next } from 'koa';

/**
 * CORS 中间件
 * 允许跨域请求
 */
export async function cors(ctx: Context, next: Next): Promise<void> {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  ctx.set('Access-Control-Max-Age', '86400');

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }

  await next();
}
