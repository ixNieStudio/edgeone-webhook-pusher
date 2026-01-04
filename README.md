# EdgeOne Webhook Pusher

Serverless webhook push service built on Tencent EdgeOne Edge Functions. Supports multiple notification channels with edge-native performance.

## Features

- 🚀 **Edge-Native** - Built on EdgeOne Edge Functions for global low-latency
- 📱 **WeChat Template Message** - First supported channel (more coming soon)
- 🔑 **Simple API** - Server酱-style webhook API: `/{sendKey}.send?title=xxx`
- 💾 **Persistent** - EdgeOne KV Storage for data persistence
- 🎛️ **Web Console** - Nuxt 4 powered management console
- 🆓 **Free Tier** - Runs entirely on EdgeOne free quota

## Supported Channels

### Current (v1.0)
- ✅ WeChat Template Message (微信模板消息)

### Planned
- ⏳ WeChat Work (企业微信)
- ⏳ DingTalk (钉钉)
- ⏳ Feishu (飞书)
- ⏳ Telegram
- ⏳ Bark (iOS)
- ⏳ Custom Webhook

## Architecture

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

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+ (required, npm/yarn not supported)
- EdgeOne CLI (`pnpm add -g edgeone`)

### Installation

```bash
# Clone the repository
git clone https://github.com/ixNieStudio/edgeone-webhook-pusher.git
cd edgeone-webhook-pusher

# Install dependencies (pnpm only)
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Start local development server
edgeone pages dev

# Run tests
pnpm test
```

### Deployment

```bash
# Build for production
pnpm build

# Deploy to EdgeOne Pages
edgeone pages deploy .output/public
```

## Usage

### Send a Push Notification

```bash
# GET request
curl "https://your-domain.com/{sendKey}.send?title=Hello&desp=World"

# POST JSON
curl -X POST "https://your-domain.com/{sendKey}.send" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello", "desp": "World"}'

# POST Form
curl -X POST "https://your-domain.com/{sendKey}.send" \
  -d "title=Hello&desp=World"
```

### API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/{sendKey}.send` | GET/POST | Send push notification |
| `/api/channels` | GET/POST | List/Add channels |
| `/api/channels/{id}` | GET/PUT/DELETE | Channel CRUD |
| `/api/messages` | GET | Message history |
| `/api/messages/{id}` | GET | Message detail |
| `/api/user/sendkey` | GET/POST | Get/Regenerate SendKey |

## Project Structure

```
edgeone-webhook-pusher/
├── packages/
│   ├── shared/           # Shared types and channel adapters
│   ├── edge-functions/   # Edge Functions (KV persistence layer)
│   ├── node-functions/   # Node Functions (Koa backend)
│   └── console/          # Nuxt 4 web console
├── .output/public/       # Build output (deploy to EdgeOne)
│   ├── index.html
│   ├── edge-functions/
│   └── node-functions/
└── ...
```

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Language**: TypeScript
- **Frontend**: Nuxt 4 + Nuxt UI
- **Backend**: Koa.js (Node Functions)
- **Persistence**: EdgeOne KV Storage (Edge Functions)
- **Testing**: Vitest + fast-check

## License

MIT
