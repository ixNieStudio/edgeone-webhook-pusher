/**
 * XML Body 中间件
 * 
 * 用于处理微信消息的 XML 请求体
 * 将 text/xml 和 application/xml 类型的请求体作为原始字符串保存
 */

import type { Context, Next } from 'koa';

/**
 * 获取原始请求体
 */
async function getRawBody(ctx: Context): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    ctx.req.setEncoding('utf8');
    ctx.req.on('data', (chunk: string) => {
      data += chunk;
    });
    ctx.req.on('end', () => {
      resolve(data);
    });
    ctx.req.on('error', reject);
  });
}

/**
 * XML Body 中间件
 * 
 * 对于 XML 类型的请求，将原始 XML 字符串保存到 ctx.request.body
 * 必须在 koa-bodyparser 之前使用
 */
export async function xmlBody(ctx: Context, next: Next): Promise<void> {
  const contentType = ctx.get('content-type') || '';
  
  // 只处理 XML 类型的请求
  if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
    try {
      const body = await getRawBody(ctx);
      (ctx.request as any).body = body;
    } catch (error) {
      console.error('[XML Body] Failed to parse XML body:', error);
    }
  }
  
  await next();
}
