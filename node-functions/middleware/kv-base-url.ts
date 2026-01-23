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
import { setKVBaseUrl } from '../shared/kv-client.js';

/**
 * 从请求上下文中提取 baseUrl
 * 支持 EdgeOne 和其他部署环境
 */
export function extractBaseUrl(ctx: Context): string {
  // 优先使用环境变量（本地开发或显式配置）
  const envUrl = process.env.KV_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  // 自动检测协议
  // EdgeOne 默认携带 X-Forwarded-Proto 头（http/https/quic）
  // 优先级：x-forwarded-proto > x-scheme > protocol > https
  let protocol = 
    ctx.get('x-forwarded-proto') || 
    ctx.get('x-scheme') || 
    ctx.protocol || 
    'https';
  
  // 如果是 quic，转换为 https
  if (protocol === 'quic') {
    protocol = 'https';
  }

  // 自动检测主机
  // EdgeOne 环境下使用 Host 头
  // 优先级：x-forwarded-host > host > localhost:8088
  const host = 
    ctx.get('x-forwarded-host') || 
    ctx.get('host') || 
    'localhost:8088';

  const baseUrl = `${protocol}://${host}`;
  
  return baseUrl;
}

/**
 * KV Base URL 中间件
 * 在每个请求开始时设置 KV API 的 baseUrl
 */
export async function kvBaseUrlMiddleware(ctx: Context, next: Next): Promise<void> {
  const baseUrl = extractBaseUrl(ctx);
  setKVBaseUrl(baseUrl);
  
  // 调试日志（仅在开发环境或启用调试时）
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_KV_URL === 'true') {
    console.log('\x1b[35m[KV]\x1b[0m Base URL:', baseUrl);
    console.log('\x1b[35m[KV]\x1b[0m Headers:', {
      'x-forwarded-proto': ctx.get('x-forwarded-proto'),
      'x-forwarded-host': ctx.get('x-forwarded-host'),
      'host': ctx.get('host'),
      'protocol': ctx.protocol,
    });
  }
  
  await next();
}
