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

  // 尝试使用 Koa 的 ctx.origin（包含 protocol 和 host）
  // ctx.origin 会自动处理代理头（当 app.proxy = true 时）
  let origin = ctx.origin;
  
  // 如果 ctx.origin 为 null，手动构建
  if (!origin || origin === 'null') {
    console.log('\x1b[33m[KV Extract]\x1b[0m ctx.origin is null, building manually');
    
    // 手动从请求头构建 origin
    const protocol = ctx.get('x-forwarded-proto') || ctx.protocol || 'https';
    const host = ctx.get('x-forwarded-host') || ctx.get('host') || ctx.host;
    
    if (host) {
      origin = `${protocol}://${host}`;
      console.log('\x1b[33m[KV Extract]\x1b[0m Manually built origin:', origin);
    } else {
      console.error('\x1b[31m[KV Extract]\x1b[0m Cannot determine host!');
      console.error('\x1b[31m[KV Extract]\x1b[0m Headers:', {
        'x-forwarded-proto': ctx.get('x-forwarded-proto'),
        'x-forwarded-host': ctx.get('x-forwarded-host'),
        'host': ctx.get('host'),
        'ctx.host': ctx.host,
        'ctx.hostname': ctx.hostname,
      });
      // 返回空字符串会导致相对路径，这会失败
      // 但至少我们能看到错误日志
      return '';
    }
  } else {
    console.log('\x1b[35m[KV Extract]\x1b[0m Using ctx.origin:', origin);
  }
  
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
  // 检查 app.proxy 设置
  const app = ctx.app as any;
  if (!app.proxy) {
    console.error('\x1b[31m[KV Middleware]\x1b[0m WARNING: app.proxy is not set to true!');
    console.error('\x1b[31m[KV Middleware]\x1b[0m This will cause ctx.origin to be null in proxy environments');
  }
  
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
