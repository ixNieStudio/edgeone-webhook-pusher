/**
 * 开发服务器工作进程
 * 由 dev-server.ts 启动，负责实际运行 Koa 应用
 */

import { createServer } from 'http';
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

const PORT = process.env.NODE_PORT || 3001;

async function start() {
  // 动态导入 Koa 应用
  const { default: app } = await import('../node-functions/v1/[[default]].js');
  
  const server = createServer(app.callback());
  
  server.listen(PORT, () => {
    const hasDebugKey = !!process.env.INTERNAL_DEBUG_KEY;
    const kvUrl = process.env.KV_BASE_URL || '(未配置，使用同源)';
    
    console.log(`${c.dim}   地址: ${c.reset}${c.cyan}http://localhost:${PORT}${c.reset}`);
    console.log(`${c.dim}   KV_BASE_URL:${c.reset} ${c.yellow}${kvUrl}${c.reset}`);
    console.log(`${c.dim}   INTERNAL_DEBUG_KEY:${c.reset} ${hasDebugKey ? `${c.green}已配置 ✓${c.reset}` : `${c.red}未配置 ✗${c.reset}`}`);
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
