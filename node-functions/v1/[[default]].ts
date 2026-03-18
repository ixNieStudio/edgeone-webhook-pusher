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
  setupRouter,
  channelCapabilitiesRouter,
  settingsAuthProfilesRouter,
  settingsIndexesRouter,
  appsRouter,
  messagesRouter,
  publicMessagesRouter,
  statsRouter,
  wechatMsgRouter,
} from '../routes/index.js';

// ============ 创建 Koa 应用 ============

const app = new Koa();

// 信任代理（EdgeOne 环境必需）
app.proxy = true;

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

router.use(setupRouter.routes());
router.use(setupRouter.allowedMethods());

router.use(channelCapabilitiesRouter.routes());
router.use(channelCapabilitiesRouter.allowedMethods());

router.use(settingsAuthProfilesRouter.routes());
router.use(settingsAuthProfilesRouter.allowedMethods());

router.use(settingsIndexesRouter.routes());
router.use(settingsIndexesRouter.allowedMethods());

router.use(appsRouter.routes());
router.use(appsRouter.allowedMethods());

router.use(messagesRouter.routes());
router.use(messagesRouter.allowedMethods());

router.use(publicMessagesRouter.routes());
router.use(publicMessagesRouter.allowedMethods());

router.use(statsRouter.routes());
router.use(statsRouter.allowedMethods());

router.use(wechatMsgRouter.routes());
router.use(wechatMsgRouter.allowedMethods());

// 注册主路由
app.use(router.routes());
app.use(router.allowedMethods());

// EdgeOne Node Functions 规范：导出 Koa 应用实例
export default app;
