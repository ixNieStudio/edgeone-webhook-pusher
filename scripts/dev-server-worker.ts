/**
 * 开发服务器工作进程
 * 由 dev-server.ts 启动，负责实际运行 Koa 应用
 */

import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

// ANSI 颜色码
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

// 加载环境变量
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

config({ path: resolve(rootDir, '.env.local') });
config({ path: resolve(rootDir, '.env') });

const PORT = process.env.NODE_PORT || 3101;
type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

function extractPathname(url = '/'): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isSendPath(pathname: string): boolean {
  return matchesPrefix(pathname, '/send')
    || pathname.endsWith('.send')
    || /^\/APK[A-Za-z0-9_-]+$/.test(pathname);
}

function rewritePathPrefix(req: IncomingMessage, prefix: string) {
  const originalUrl = req.url || '/';
  if (originalUrl === prefix) {
    req.url = '/';
    return;
  }

  if (originalUrl.startsWith(`${prefix}/`)) {
    req.url = originalUrl.slice(prefix.length) || '/';
  }
}

async function start() {
  const [
    { default: v1App },
    { default: sendApp },
    { default: mcpApp },
  ] = await Promise.all([
    import('../node-functions/v1/[[default]].js'),
    import('../node-functions/send/[[key]].js'),
    import('../node-functions/mcp/[[default]].js'),
  ]);

  const v1Handler = v1App.callback() as NodeHandler;
  const sendHandler = sendApp.callback() as NodeHandler;
  const mcpHandler = mcpApp.callback() as NodeHandler;

  const server = createServer((req, res) => {
    const pathname = extractPathname(req.url);

    if (matchesPrefix(pathname, '/mcp')) {
      mcpHandler(req, res);
      return;
    }

    if (isSendPath(pathname)) {
      sendHandler(req, res);
      return;
    }

    if (matchesPrefix(pathname, '/v1')) {
      rewritePathPrefix(req, '/v1');
    }

    v1Handler(req, res);
  });
  
  server.listen(PORT, () => {
    const hasInternalKey = !!process.env.BUILD_KEY;
    const kvUrl = process.env.KV_BASE_URL || '(未配置，使用同源)';
    
    console.log(`${c.dim}   地址: ${c.reset}${c.cyan}http://localhost:${PORT}${c.reset}`);
    console.log(`${c.dim}   KV_BASE_URL:${c.reset} ${c.yellow}${kvUrl}${c.reset}`);
    console.log(`${c.dim}   BUILD_KEY:${c.reset} ${hasInternalKey ? `${c.green}已配置 ✓${c.reset}` : `${c.red}未配置 ✗${c.reset}`}`);
    console.log(`${c.dim}   MCP:${c.reset} ${c.cyan}http://localhost:${PORT}/mcp${c.reset}`);
    console.log('');
    console.log(`${c.green}✓${c.reset} 服务器已启动`);
    console.log(`${c.blue}💡 提示:${c.reset} 在另一个终端运行 ${c.cyan}yarn dev${c.reset} 启动前端`);
    console.log('');
  });
}

start().catch((error) => {
  console.error(`${c.red}启动失败:${c.reset}`, error);
  process.exit(1);
});
