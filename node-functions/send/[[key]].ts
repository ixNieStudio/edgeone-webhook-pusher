/**
 * Webhook Push Route
 * 
 * URL: /{appKey}.send
 * Methods: GET, POST
 * 
 * GET: Query params - title (required), desp (optional)
 * POST: JSON body - { title, desp }
 *
 * 无需认证 - 通过 App Key 验证
 */

import Koa from 'koa';
// @ts-ignore - koa-bodyparser types are not fully compatible
import bodyParser from 'koa-bodyparser';
import { pushService } from '../services/push.service.js';
import { kvBaseUrlMiddleware } from '../middleware/index.js';
import { ErrorCodes } from '../types/index.js';
import type { PushMessageInput } from '../types/index.js';

const app = new Koa();

// 信任代理（EdgeOne 环境必需）
app.proxy = true;

// 验证 app.proxy 设置
console.log('\x1b[36m[Send Init]\x1b[0m app.proxy is set to:', app.proxy);

// CORS 中间件
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type');

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }

  await next();
});

// Body parser
app.use(bodyParser());

// KV Base URL 中间件
app.use(kvBaseUrlMiddleware);

// 主处理逻辑
app.use(async (ctx) => {
  const pathname = ctx.path;
  console.log('\x1b[36m[Send]\x1b[0m Request path:', pathname);
  console.log('\x1b[36m[Send]\x1b[0m Full URL:', ctx.url);
  console.log('\x1b[36m[Send]\x1b[0m Method:', ctx.method);

  // 只允许 GET 和 POST
  if (ctx.method !== 'GET' && ctx.method !== 'POST') {
    ctx.status = 405;
    ctx.body = {
      code: ErrorCodes.INVALID_PARAM,
      message: 'Method not allowed. Use GET or POST.',
      data: null,
    };
    return;
  }

  // 从 URL 提取 App Key
  const appKey = extractAppKey(pathname);
  console.log('\x1b[36m[Send]\x1b[0m Extracted appKey:', appKey);
  
  if (!appKey) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.INVALID_PARAM,
      message: 'Invalid URL format',
      data: null,
    };
    return;
  }

  // 解析消息
  const message = parseMessage(ctx);

  // 验证 title
  if (!message.title) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.MISSING_TITLE,
      message: 'Missing required field: title',
      data: null,
    };
    return;
  }

  // 推送消息
  try {
    const result = await pushService.push(appKey, message);

    ctx.body = {
      code: 0,
      message: 'success',
      data: {
        pushId: result.pushId,
        total: result.total,
        success: result.success,
        failed: result.failed,
        results: result.results,
      },
    };
  } catch (error) {
    console.error('Push error:', error);
    ctx.status = 500;
    ctx.body = {
      code: ErrorCodes.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : 'Internal error',
      data: null,
    };
  }
});

/**
 * 从 URL 路径提取 App Key
 * 支持: /APKxxx.send 或 /send/APKxxx 或 /APKxxx (EdgeOne catch-all)
 */
function extractAppKey(pathname: string): string | null {
  // Pattern: /:appKey.send
  const dotMatch = pathname.match(/\/([^/]+)\.send$/);
  if (dotMatch) {
    return dotMatch[1];
  }

  // Pattern: /send/:appKey
  const slashMatch = pathname.match(/\/send\/([^/]+)/);
  if (slashMatch) {
    return slashMatch[1];
  }

  // Pattern: /:appKey (EdgeOne catch-all route, path is just the key)
  // 当 EdgeOne 使用 [[key]].ts 时，ctx.path 可能只是 /APKxxx
  const directMatch = pathname.match(/^\/([A-Za-z0-9_-]+)$/);
  if (directMatch && directMatch[1].startsWith('APK')) {
    return directMatch[1];
  }

  return null;
}

/**
 * 从请求中解析消息
 */
function parseMessage(ctx: Koa.Context): PushMessageInput {
  if (ctx.method === 'GET') {
    // GET: 从 query params 获取
    return {
      title: ctx.query.title as string || '',
      desp: ctx.query.desp as string | undefined,
    };
  }

  // POST: 从 body 获取
  const body = (ctx.request as { body?: { title?: string; desp?: string } }).body;
  return {
    title: body?.title || '',
    desp: body?.desp,
  };
}

// EdgeOne Node Functions 规范：导出 Koa 应用实例
export default app;
