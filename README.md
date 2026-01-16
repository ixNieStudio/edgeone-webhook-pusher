# EdgeOne Webhook Pusher

基于腾讯云 EdgeOne Pages 构建的 Serverless 消息推送服务，支持多渠道推送和订阅群发，采用 Webhook 风格 API。

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/ixNieStudio/edgeone-webhook-pusher)

> CDN acceleration and security protection for this project are sponsored by [Tencent EdgeOne](https://edgeone.ai).
> 
> [![Tencent EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/logo.svg)](https://edgeone.ai)

## 特性

- 🚀 **边缘原生** - 基于 EdgeOne Edge Functions + Node Functions，全球低延迟
- 📱 **微信推送** - 支持微信订阅号模板消息
- 🔑 **多应用管理** - 创建多个应用用于不同推送场景
- 📢 **订阅群发** - 支持单发和订阅模式群发
- 🔗 **Webhook 风格** - 简单 URL 调用：`/{appKey}.send?title=xxx`
- 💾 **KV 存储** - EdgeOne KV 持久化，完全无状态架构
- 🎛️ **Web 控制台** - Nuxt 4 + TDesign + Iconify 管理界面
- 🔒 **安全设计** - 管理 API 需 Token 鉴权，推送 API 通过 App Key 验证

## 自托管部署

### 1. 部署项目

点击下方按钮，Fork 项目并部署到 EdgeOne Pages：

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/ixNieStudio/edgeone-webhook-pusher)

### 2. 构建配置

| 配置项 | 值 |
|--------|-----|
| Root directory | `/` |
| Build output directory | `dist` |
| Build command | `yarn build` |
| Install command | `yarn install` |

### 3. 绑定 KV 命名空间

在 EdgeOne 控制台「Pages」→「进入项目」→「KV 存储」→「绑定命名空间」中绑定以下命名空间：

| KV 绑定名称 | 用途说明 |
|------------|----------|
| `CONFIG_KV` | 系统配置存储 |
| `CHANNELS_KV` | 渠道数据存储 |
| `APPS_KV` | 应用数据存储 |
| `OPENIDS_KV` | 订阅者数据存储 |
| `MESSAGES_KV` | 消息历史存储 |

### 4. 完成部署

重新部署项目，访问应用完成初始化，系统会自动生成 Admin Token，请妥善保存。

## 使用方法

### Webhook 推送

```bash
# GET 请求
curl "https://your-domain.com/{appKey}.send?title=服务器告警&desp=CPU使用率超过90%"

# POST 请求
curl -X POST "https://your-domain.com/{appKey}.send" \
  -H "Content-Type: application/json" \
  -d '{"title": "服务器告警", "desp": "CPU使用率超过90%"}'
```

### 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pushId": "msg_abc123",
    "total": 1,
    "success": 1,
    "failed": 0
  }
}
```

## API 参考

### 推送 API（通过 App Key 验证）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET/POST | `/{appKey}.send?title=xxx&desp=xxx` | 消息推送 |

### 管理 API（需要 Admin Token）

请求头：`X-Admin-Token: your-admin-token` 或 `Authorization: Bearer your-admin-token`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/v1/init/status` | 检查初始化状态 |
| POST | `/v1/init` | 执行初始化 |
| GET/PUT | `/v1/config` | 系统配置 |
| GET/POST | `/v1/channels` | 渠道管理 |
| GET/POST | `/v1/apps` | 应用管理 |
| GET | `/v1/messages` | 消息历史 |

## 技术栈

- **前端**: Nuxt 4 + Vue 3 + Tailwind CSS
- **后端**: TypeScript + Koa 3 + @koa/router
- **存储**: EdgeOne KV
- **部署**: EdgeOne Pages

## 更新日志

### 2026-01-16

- **UI 主题系统重构** - 全新设计的主题色系统，支持 Light/Dark 模式
- 使用 Tailwind CSS 替代 TDesign 组件库
- 更换为 Tabler Icons 图标库
- 优化首页仪表盘和部署指南

### 2026-01-15

- **TypeScript 迁移完成** - 后端代码全面迁移到 TypeScript
- 使用 Koa + @koa/router 重构路由架构
- 添加完整的类型定义和类型安全

### 2026-01-14

- 修复前端管理界面与后端 API 接口不匹配问题
- 添加 EdgeOne CLI 本地调试支持

## 许可证

GPL-3.0

## 作者

colin@ixNieStudio
