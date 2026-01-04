# EdgeOne Webhook Pusher

基于腾讯云 EdgeOne Edge Functions 构建的 Serverless Webhook 推送服务，支持多渠道消息通知，具备边缘原生的低延迟性能。

## 特性

- 🚀 **边缘原生** - 基于 EdgeOne Edge Functions，全球低延迟
- 📱 **多渠道支持** - 微信模板消息（更多渠道即将支持）
- 🔑 **简单 API** - 一个 URL 即可推送：`/{sendKey}.send?title=xxx`
- 💾 **持久化存储** - EdgeOne KV 存储，数据安全可靠
- 🎛️ **Web 控制台** - Nuxt 4 + TDesign 构建的管理界面
- 🆓 **免费额度** - 完全运行在 EdgeOne 免费额度内

## 支持的渠道

### 当前版本 (v1.0)
- ✅ 微信模板消息

### 计划中
- ⏳ 企业微信
- ⏳ 钉钉
- ⏳ 飞书
- ⏳ Telegram
- ⏳ Bark (iOS)
- ⏳ 自定义 Webhook

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      EdgeOne Pages                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Nuxt 4    │  │    Node     │  │   Edge Functions    │  │
│  │   Console   │──│  Functions  │──│    (KV Layer)       │  │
│  │  (Frontend) │  │   (Koa)     │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                    │             │
│                          ▼                    ▼             │
│                   ┌─────────────┐      ┌───────────┐        │
│                   │   Channel   │      │  EdgeOne  │        │
│                   │  Adapters   │      │    KV     │        │
│                   └─────────────┘      └───────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Node.js 20+
- pnpm 9+（必须使用 pnpm）
- EdgeOne CLI (`pnpm add -g edgeone`)

### 安装

```bash
# 克隆仓库
git clone https://github.com/ixNieStudio/edgeone-webhook-pusher.git
cd edgeone-webhook-pusher

# 安装依赖
pnpm install

# 构建所有包
pnpm build
```

### 本地开发

```bash
# 启动本地开发服务器
pnpm dev

# 运行测试
pnpm test
```

### 部署

```bash
# 构建生产版本
pnpm build

# 部署到 EdgeOne Pages
pnpm deploy
```

## 使用方法

### 发送推送通知

```bash
# GET 请求
curl "https://your-domain.com/{sendKey}.send?title=Hello&desp=World"

# POST JSON
curl -X POST "https://your-domain.com/{sendKey}.send" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello", "desp": "World"}'

# POST Form
curl -X POST "https://your-domain.com/{sendKey}.send" \
  -d "title=Hello&desp=World"
```

### API 参考

| 端点 | 方法 | 描述 |
|------|------|------|
| `/{sendKey}.send` | GET/POST | 发送推送通知 |
| `/api/channels` | GET/POST | 渠道列表/添加 |
| `/api/channels/{id}` | GET/PUT/DELETE | 渠道 CRUD |
| `/api/messages` | GET | 消息历史 |
| `/api/messages/{id}` | GET | 消息详情 |
| `/api/user` | GET | 获取用户信息 |
| `/api/user/regenerate` | POST | 重新生成 SendKey |

## 项目结构

```
edgeone-webhook-pusher/
├── packages/
│   ├── shared/           # 共享类型和渠道适配器
│   ├── edge-functions/   # Edge Functions (KV 持久化层)
│   ├── node-functions/   # Node Functions (Koa 后端)
│   └── console/          # Nuxt 4 Web 控制台
├── .output/public/       # 构建输出（部署到 EdgeOne）
│   ├── index.html
│   ├── edge-functions/
│   └── node-functions/
└── ...
```

## 技术栈

- **Monorepo**: pnpm workspaces + Turborepo
- **语言**: TypeScript
- **前端**: Nuxt 4 + TDesign Vue Next
- **后端**: Koa.js (Node Functions)
- **持久化**: EdgeOne KV Storage (Edge Functions)
- **测试**: Vitest + fast-check

## 许可证

GPL-3.0

## 作者

colin@ixNieStudio  
Email: colin@ixnie.cn  
GitHub: https://github.com/ixNieStudio
