# EdgeOne Webhook Pusher

> 🚀 免费白嫖的微信消息推送服务，一键部署到 EdgeOne Pages，无需服务器

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/ixNieStudio/edgeone-webhook-pusher)

> 本项目由 [Tencent EdgeOne](https://edgeone.ai) 提供 CDN 加速和安全防护赞助
> 
> [![Tencent EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/logo.svg)](https://edgeone.ai)

## ✨ 功能特性

- 🆓 **完全免费** - 部署在 EdgeOne Pages 免费套餐，无需付费
- ⚡ **一键部署** - 点击按钮即可部署，无需服务器、无需运维
- 📱 **微信推送** - 支持微信公众号模板消息，消息直达微信
- 🔗 **Webhook 风格** - 简单 URL 调用，一行代码搞定推送
- 🔑 **多应用管理** - 为不同场景创建独立应用，互不干扰
- 📢 **订阅群发** - 支持单发和订阅模式群发
- 🎛️ **Web 控制台** - 可视化管理界面，配置更简单
- 🔒 **数据自主** - 数据存储在你自己的账户，完全可控
- 🌍 **全球加速** - EdgeOne 边缘节点，全球低延迟

## 🚀 快速开始

### 一键部署

1. 点击上方 **Deploy to EdgeOne** 按钮
2. 登录/注册 EdgeOne 账号，Fork 项目
3. 绑定 KV 命名空间（见下方说明）
4. 部署完成，访问应用初始化，保存 Admin Token

### 绑定 KV 命名空间

在 EdgeOne 控制台「Pages」→「进入项目」→「KV 存储」→「绑定命名空间」：

| 绑定名称 | 用途 |
|----------|------|
| `CONFIG_KV` | 系统配置 |
| `CHANNELS_KV` | 渠道数据 |
| `APPS_KV` | 应用数据 |
| `OPENIDS_KV` | 订阅者数据 |
| `MESSAGES_KV` | 消息历史 |

### 构建配置

| 配置项 | 值 |
|--------|-----|
| Root directory | `/` |
| Build output directory | `dist` |
| Build command | `yarn build` |
| Install command | `yarn install` |

## 📖 使用方法

### 发送消息

```bash
# GET 请求
curl "https://your-domain.com/{appKey}.send?title=服务器告警&desp=CPU使用率超过90%"

# POST 请求
curl -X POST "https://your-domain.com/{appKey}.send" \
  -d "title=服务器告警&desp=CPU使用率超过90%"
```

### 参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 消息标题 |
| desp | 否 | 消息内容 |

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pushId": "msg_abc123",
    "success": 1,
    "failed": 0
  }
}
```

## 💡 应用场景

- 🖥️ 服务器监控告警
- 🔔 定时任务执行通知
- 🛒 订单状态推送
- 📊 数据报表推送
- 🔐 安全告警通知
- 🤖 IoT 设备状态推送

## �️ 技术栈

- **前端**: Nuxt 4 + Vue 3 + Tailwind CSS
- **后端**: TypeScript + Koa
- **存储**: EdgeOne KV
- **部署**: EdgeOne Pages

## 📝 更新日志

### 2026-01-16
- 全新 UI 主题系统，支持 Light/Dark 模式

### 2026-01-15
- TypeScript 全面重构

### 2026-01-14
- 首个公开版本发布

## 📄 开源协议

GPL-3.0

## 👨‍💻 作者

colin@ixNieStudio

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
