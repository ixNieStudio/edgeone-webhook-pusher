/**
 * EdgeOne Node Functions - TypeScript + Koa 验证示例
 * 
 * 验证目标：
 * 1. TypeScript 文件能否被 EdgeOne Pages 正确处理
 * 2. Koa 应用能否正常导出和运行
 * 3. 类型定义是否正常工作
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import type { ApiResponse, TestItem, ErrorCode } from './types/index.js';

// 创建 Koa 应用
const app = new Koa();
const router = new Router();

// CORS 中间件
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }
  
  await next();
});

// Body parser
app.use(bodyParser());

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Error:', err);
    ctx.status = 500;
    ctx.body = {
      code: 50001,
      message: err instanceof Error ? err.message : 'Internal error',
      data: null,
    } as ApiResponse<null>;
  }
});

// 健康检查
router.get('/health', async (ctx) => {
  const response: ApiResponse<{ status: string; timestamp: string; runtime: string }> = {
    code: 0,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      runtime: 'TypeScript + Koa',
    },
  };
  ctx.body = response;
});

// 获取列表
router.get('/items', async (ctx) => {
  const items: TestItem[] = [
    { id: '1', name: 'Item 1', createdAt: new Date().toISOString() },
    { id: '2', name: 'Item 2', createdAt: new Date().toISOString() },
  ];
  
  const response: ApiResponse<TestItem[]> = {
    code: 0,
    data: items,
  };
  ctx.body = response;
});

// 创建项目
router.post('/items', async (ctx) => {
  const body = ctx.request.body as { name?: string };
  
  if (!body.name) {
    ctx.status = 400;
    ctx.body = {
      code: 40001,
      message: 'Missing required field: name',
      data: null,
    } as ApiResponse<null>;
    return;
  }
  
  const item: TestItem = {
    id: Date.now().toString(),
    name: body.name,
    createdAt: new Date().toISOString(),
  };
  
  ctx.status = 201;
  ctx.body = {
    code: 0,
    message: 'Created',
    data: item,
  } as ApiResponse<TestItem>;
});

// 获取单个项目
router.get('/items/:id', async (ctx) => {
  const { id } = ctx.params;
  
  // 模拟数据
  if (id === '1' || id === '2') {
    const item: TestItem = {
      id,
      name: `Item ${id}`,
      createdAt: new Date().toISOString(),
    };
    ctx.body = { code: 0, data: item } as ApiResponse<TestItem>;
  } else {
    ctx.status = 404;
    ctx.body = {
      code: 40401,
      message: 'Item not found',
      data: null,
    } as ApiResponse<null>;
  }
});

// 注册路由
app.use(router.routes());
app.use(router.allowedMethods());

// EdgeOne Node Functions 规范：导出 Koa 应用实例
export default app;
