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
import { errorHandler, responseWrapper, cors, xmlBody, kvBaseUrlMiddleware } from '../middleware/index.js';

// 路由
import {
  initRouter,
  authRouter,
  configRouter,
  channelsRouter,
  appsRouter,
  openidsRouter,
  bindcodeRouter,
  messagesRouter,
  statsRouter,
  wechatMsgRouter,
  demoAppsRouter,
} from '../routes/index.js';

// ============ 创建 Koa 应用 ============

const app = new Koa();

// 信任代理（EdgeOne 环境必需）
app.proxy = true;

// 验证 app.proxy 设置
console.log('\x1b[36m[App Init]\x1b[0m app.proxy is set to:', app.proxy);

// 错误处理中间件（最外层）
app.use(errorHandler);

// KV Base URL 中间件（必须在业务逻辑之前，但在错误处理之后）
app.use(kvBaseUrlMiddleware);

// CORS 中间件
app.use(cors);

// XML Body 中间件（必须在 bodyParser 之前，用于处理微信 XML 消息）
app.use(xmlBody);

// Body parser - 支持 JSON 和 form
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

router.use(authRouter.routes());
router.use(authRouter.allowedMethods());

router.use(configRouter.routes());
router.use(configRouter.allowedMethods());

router.use(channelsRouter.routes());
router.use(channelsRouter.allowedMethods());

router.use(appsRouter.routes());
router.use(appsRouter.allowedMethods());

router.use(openidsRouter.routes());
router.use(openidsRouter.allowedMethods());

router.use(bindcodeRouter.routes());
router.use(bindcodeRouter.allowedMethods());

router.use(messagesRouter.routes());
router.use(messagesRouter.allowedMethods());

router.use(statsRouter.routes());
router.use(statsRouter.allowedMethods());

router.use(wechatMsgRouter.routes());
router.use(wechatMsgRouter.allowedMethods());

router.use(demoAppsRouter.routes());
router.use(demoAppsRouter.allowedMethods());

// 注册主路由
app.use(router.routes());
app.use(router.allowedMethods());

// EdgeOne Node Functions 规范：导出 Koa 应用实例
export default app;
