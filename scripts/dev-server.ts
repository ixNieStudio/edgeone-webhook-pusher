/**
 * 本地开发服务器 - 独立运行 Node Functions（支持热重载）
 * 
 * 用于本地调试时：
 * - 前端 (Nuxt) → 本地 Node Functions → 远程 Edge Functions KV API
 * 
 * 使用方式：
 * 1. 配置 .env.local 中的 KV_BASE_URL 和 BUILD_KEY
 * 2. 运行 yarn dev:node 启动此服务器
 * 3. 运行 yarn dev 启动前端（会自动代理到此服务器）
 * 
 * 热重载：修改 node-functions 目录下的文件会自动重启服务器
 */

import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { watch } from 'fs';

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const nodeFunctionsDir = resolve(rootDir, 'node-functions');

let serverProcess: ChildProcess | null = null;
let reloadCount = 0;

/**
 * 启动服务器子进程
 */
function startServerProcess() {
  // 使用 tsx 运行实际的服务器
  serverProcess = spawn('npx', ['tsx', resolve(__dirname, 'dev-server-worker.ts')], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env },
  });

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`${c.red}服务器进程退出，代码: ${code}${c.reset}`);
    }
  });
}

/**
 * 重启服务器
 */
function restartServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  startServerProcess();
}

/**
 * 设置文件监听器
 */
function setupWatcher() {
  let reloadTimeout: ReturnType<typeof setTimeout> | null = null;
  
  watch(nodeFunctionsDir, { recursive: true }, (_, filename) => {
    if (!filename) return;
    if (!filename.endsWith('.ts') && !filename.endsWith('.js')) return;
    if (filename.endsWith('.test.ts') || filename.endsWith('.test.js')) return;
    if (filename.includes('node_modules')) return;
    
    if (reloadTimeout) {
      clearTimeout(reloadTimeout);
    }
    
    reloadTimeout = setTimeout(() => {
      reloadCount++;
      const time = new Date().toLocaleTimeString();
      console.log('');
      console.log(`${c.dim}[${time}]${c.reset} ${c.yellow}⟳${c.reset} 检测到文件变化: ${c.cyan}${filename}${c.reset}`);
      console.log(`${c.dim}[${time}]${c.reset} ${c.blue}↻${c.reset} 重启服务器... ${c.dim}(#${reloadCount})${c.reset}`);
      restartServer();
    }, 200);
  });
}

// 主入口
console.log('');
console.log(`${c.green}${c.bold}🚀 Node Functions 开发服务器${c.reset}`);
console.log(`${c.blue}🔄 热重载:${c.reset} 监听 ${c.cyan}node-functions/${c.reset} 目录变化`);
console.log('');

startServerProcess();
setupWatcher();

// 处理退出信号
process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});
