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
  // 打印所有相关的请求信息用于调试
  console.log('=== KV Base URL Detection ===');
  console.log('Request URL:', ctx.url);
  console.log('Request Method:', ctx.method);
  console.log('Headers:', JSON.stringify({
    'host': ctx.get('host'),
    'x-forwarded-host': ctx.get('x-forwarded-host'),
    'x-forwarded-proto': ctx.get('x-forwarded-proto'),
    'x-forwarded-for': ctx.get('x-forwarded-for'),
    'referer': ctx.get('referer'),
    'origin': ctx.get('origin'),
    'user-agent': ctx.get('user-agent'),
  }, null, 2));
  console.log('ctx.protocol:', ctx.protocol);
  console.log('ctx.host:', ctx.host);
  console.log('ctx.origin:', ctx.origin);
  console.log('ctx.hostname:', ctx.hostname);
  
  // 优先使用环境变量（本地开发或显式配置）
  const envUrl = process.env.KV_BASE_URL;
  if (envUrl && envUrl.trim()) {
    console.log('Using KV_BASE_URL from env:', envUrl.trim());
    console.log('=============================\n');
    return envUrl.trim();
  }

  // 尝试使用 Koa 的 ctx.origin
  let origin = ctx.origin;
  
  // 如果 ctx.origin 为 null，手动构建
  if (!origin || origin === 'null') {
    const protocol = ctx.get('x-forwarded-proto') || ctx.protocol || 'https';
    console.log('Detected protocol:', protocol);
    
    // EdgeOne 特殊处理：从 referer 中提取真实域名
    const referer = ctx.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        origin = `${protocol}://${refererUrl.host}`;
        console.log('Extracted origin from referer:', origin);
        console.log('=============================\n');
        return origin;
      } catch (e) {
        console.log('Failed to parse referer:', e);
        // 解析失败，继续使用后备方案
      }
    }
    
    // 后备方案：使用 Host 头
    const host = ctx.get('x-forwarded-host') || ctx.get('host') || ctx.host;
    console.log('Detected host:', host);
    if (host) {
      origin = `${protocol}://${host}`;
    } else {
      console.log('WARNING: No host found!');
      console.log('=============================\n');
      return '';
    }
  }
  
  console.log('Final baseUrl:', origin);
  console.log('=============================\n');
  return origin;
}

/**
 * KV Base URL 中间件
 * 在每个请求开始时设置 KV API 的 baseUrl
 */
export async function kvBaseUrlMiddleware(ctx: Context, next: Next): Promise<void> {
  const baseUrl = extractBaseUrl(ctx);
  
  // 使用 AsyncLocalStorage 运行后续中间件
  await runKVOperation(baseUrl, () => next());
}
