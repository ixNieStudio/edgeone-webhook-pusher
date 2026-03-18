import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import type { Context } from 'koa';
import { kvBaseUrlMiddleware } from '../middleware/kv-base-url.js';

export type McpKoaHandler = (ctx: Context) => Promise<void> | void;

const mcpAllowedHosts = parseList(process.env.MCP_ALLOWED_HOSTS);
const mcpAllowedOrigins = parseList(process.env.MCP_ALLOWED_ORIGINS);

function parseList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function shouldValidateLocalHost(): boolean {
  return process.env.EDGEONE_LOCAL_DEV === 'true';
}

function isAllowedLocalHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '[::1]'
    || normalized.endsWith('.localhost');
}

function hostMatchesPattern(hostname: string, pattern: string): boolean {
  const normalizedHost = hostname.trim().toLowerCase();
  const normalizedPattern = pattern.trim().toLowerCase();

  if (!normalizedPattern) return false;
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2);
    return Boolean(suffix) && normalizedHost.endsWith(`.${suffix}`);
  }

  return normalizedHost === normalizedPattern;
}

function isAllowedHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return false;

  if (shouldValidateLocalHost()) {
    return isAllowedLocalHost(normalized);
  }

  if (mcpAllowedHosts.length === 0) {
    return true;
  }

  return mcpAllowedHosts.some((pattern) => hostMatchesPattern(normalized, pattern));
}

function originMatchesPattern(origin: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase();
  if (!normalizedPattern) return false;

  try {
    const requestUrl = new URL(origin);
    const requestOrigin = requestUrl.origin.toLowerCase();

    if (normalizedPattern.startsWith('http://*.') || normalizedPattern.startsWith('https://*.')) {
      const wildcardUrl = new URL(normalizedPattern.replace('*.', 'placeholder.'));
      const suffix = wildcardUrl.hostname.replace(/^placeholder\./, '');
      return requestUrl.protocol === wildcardUrl.protocol && requestUrl.hostname.toLowerCase().endsWith(`.${suffix}`);
    }

    return requestOrigin === normalizedPattern;
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (mcpAllowedOrigins.length === 0) return true;

  return mcpAllowedOrigins.some((pattern) => originMatchesPattern(origin, pattern));
}

function setCorsHeaders(ctx: Context) {
  const requestOrigin = ctx.get('origin') || undefined;

  if (requestOrigin && mcpAllowedOrigins.length > 0) {
    if (isAllowedOrigin(requestOrigin)) {
      ctx.set('Access-Control-Allow-Origin', requestOrigin);
      ctx.vary('Origin');
    }
  } else {
    ctx.set('Access-Control-Allow-Origin', '*');
  }

  ctx.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  ctx.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID'
  );
}

export function createMcpApp(handler: McpKoaHandler) {
  const app = new Koa();
  app.proxy = true;

  app.use(async (ctx, next) => {
    if (!isAllowedHost(ctx.hostname)) {
      writeJson(ctx, 403, {
        error: 'invalid_host',
        error_description: shouldValidateLocalHost()
          ? 'Local MCP development endpoints only accept loopback hosts.'
          : 'This host is not allowed for the MCP endpoint.',
      });
      return;
    }

    if (!isAllowedOrigin(ctx.get('origin') || undefined)) {
      writeJson(ctx, 403, {
        error: 'invalid_origin',
        error_description: 'This origin is not allowed for the MCP endpoint.',
      });
      return;
    }

    setCorsHeaders(ctx);

    if (ctx.method === 'OPTIONS') {
      ctx.status = 204;
      return;
    }

    await next();
  });

  app.use(kvBaseUrlMiddleware);
  app.use(bodyParser({
    enableTypes: ['json', 'form', 'text'],
  }));
  app.use(async (ctx) => {
    await handler(ctx);
  });

  return app;
}

export function writeJson(ctx: Context, status: number, body: unknown) {
  ctx.status = status;
  ctx.type = 'application/json';
  ctx.body = body;
}
