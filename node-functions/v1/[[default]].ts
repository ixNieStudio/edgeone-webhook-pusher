/**
 * EdgeOne Node Functions - TypeScript + Koa
 * Route: /v1/*
 * 
 * 应用入口文件，注册所有中间件和路由
 */

import Koa from 'koa';
import Router from '@koa/router';
// @ts-ignore - koa-bodyparser types are not fully compatible
import bodyParser from 'koa-bodyparser';

// 中间件
import { errorHandler, responseWrapper, cors } from '../middleware/index.js';

// 路由
import {
  initRouter,
  configRouter,
  channelsRouter,
  appsRouter,
  openidsRouter,
  messagesRouter,
  statsRouter,
  wechatMsgRouter,
} from '../routes/index.js';

// KV 客户端
import { setKVBaseUrl } from '../shared/kv-client.js';

// ============ 创建 Koa 应用 ============

const app = new Koa();

// 设置 KV baseUrl 的中间件
// Edge Functions 和 Node Functions 同源，但本地开发时端口不同
// Node Functions 内部运行在 9000 端口，需要请求 8088 端口的 Edge Functions
app.use(async (ctx, next) => {
  const protocol = ctx.get('x-forwarded-proto') || ctx.protocol || 'http';
  let host = ctx.get('host') || 'localhost:8088';
  
  // 本地开发时，Node Functions 内部端口是 9000，需要改为 8088
  if (host.includes(':9000')) {
    host = host.replace(':9000', ':8088');
  }
  
  const baseUrl = `${protocol}://${host}`;
  setKVBaseUrl(baseUrl);
  await next();
});

// 错误处理中间件（最外层）
app.use(errorHandler);

// CORS 中间件
app.use(cors);

// Body parser
app.use(bodyParser());

// 响应包装中间件
app.use(responseWrapper);

// ============ 注册路由 ============

const router = new Router();

// 健康检查
router.get('/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'TypeScript + Koa',
  };
});

// 注册业务路由
router.use(initRouter.routes());
router.use(initRouter.allowedMethods());

router.use(configRouter.routes());
router.use(configRouter.allowedMethods());

router.use(channelsRouter.routes());
router.use(channelsRouter.allowedMethods());

router.use(appsRouter.routes());
router.use(appsRouter.allowedMethods());

router.use(openidsRouter.routes());
router.use(openidsRouter.allowedMethods());

router.use(messagesRouter.routes());
router.use(messagesRouter.allowedMethods());

router.use(statsRouter.routes());
router.use(statsRouter.allowedMethods());

router.use(wechatMsgRouter.routes());
router.use(wechatMsgRouter.allowedMethods());

// 注册主路由
app.use(router.routes());
app.use(router.allowedMethods());

// EdgeOne Node Functions 规范：导出 Koa 应用实例
export default app;
