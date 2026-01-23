/**
 * KV Base URL 中间件
 * 
 * 自动从请求上下文中提取域名，设置 KV API 的 baseUrl
 * 优先使用环境变量 KV_BASE_URL，否则自动检测当前域名
 * 
 * EdgeOne 环境说明：
 * - EdgeOne 默认携带 X-Forwarded-Proto 和 X-Forwarded-For 头
 * - 协议通过 X-Forwarded-Proto 获取（http/https/quic）
 * - 主机通过 Host 头获取
 */

import type { Context, Next } from 'koa';
import { runKVOperation } from '../shared/kv-client.js';

/**
 * 从请求上下文中提取 baseUrl
 * 支持 EdgeOne 和其他部署环境
 */
export function extractBaseUrl(ctx: Context): string {
  // 优先使用环境变量（本地开发或显式配置）
  const envUrl = process.env.KV_BASE_URL;
  if (envUrl && envUrl.trim()) {
    console.log('\x1b[35m[KV Extract]\x1b[0m Using KV_BASE_URL from env:', envUrl.trim());
    return envUrl.trim();
  }

  // 使用 Koa 的 ctx.origin（包含 protocol 和 host）
  // ctx.origin 会自动处理代理头（当 app.proxy = true 时）
  const origin = ctx.origin;
  
  console.log('\x1b[35m[KV Extract]\x1b[0m Using ctx.origin:', origin);
  console.log('\x1b[35m[KV Extract]\x1b[0m app.proxy should be true for EdgeOne');
  
  // 详细调试日志
  if (process.env.DEBUG_KV_URL === 'true') {
    console.log('\x1b[35m[KV Extract]\x1b[0m ctx.protocol:', ctx.protocol);
    console.log('\x1b[35m[KV Extract]\x1b[0m ctx.host:', ctx.host);
    console.log('\x1b[35m[KV Extract]\x1b[0m ctx.hostname:', ctx.hostname);
    console.log('\x1b[35m[KV Extract]\x1b[0m Headers:', {
      'x-forwarded-proto': ctx.get('x-forwarded-proto'),
      'x-forwarded-host': ctx.get('x-forwarded-host'),
      'host': ctx.get('host'),
    });
  }
  
  return origin;
}

/**
 * KV Base URL 中间件
 * 在每个请求开始时设置 KV API 的 baseUrl
 */
export async function kvBaseUrlMiddleware(ctx: Context, next: Next): Promise<void> {
  const baseUrl = extractBaseUrl(ctx);
  
  // 总是打印 baseUrl（用于调试）
  console.log('\x1b[35m[KV Middleware]\x1b[0m Request:', ctx.method, ctx.path);
  console.log('\x1b[35m[KV Middleware]\x1b[0m Base URL:', baseUrl);
  
  // 详细调试日志
  if (process.env.DEBUG_KV_URL === 'true') {
    console.log('\x1b[35m[KV Middleware]\x1b[0m ctx.origin:', ctx.origin);
    console.log('\x1b[35m[KV Middleware]\x1b[0m ctx.protocol:', ctx.protocol);
    console.log('\x1b[35m[KV Middleware]\x1b[0m ctx.host:', ctx.host);
    console.log('\x1b[35m[KV Middleware]\x1b[0m ctx.hostname:', ctx.hostname);
    console.log('\x1b[35m[KV Middleware]\x1b[0m Headers:', {
      'x-forwarded-proto': ctx.get('x-forwarded-proto'),
      'x-forwarded-host': ctx.get('x-forwarded-host'),
      'host': ctx.get('host'),
    });
  }
  
  // 使用 AsyncLocalStorage 运行后续中间件
  await runKVOperation(baseUrl, () => next());
}
