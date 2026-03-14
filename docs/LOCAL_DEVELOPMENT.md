# 本地开发指南

## 环境要求

- Node.js 22+
- Yarn 1.22+
- EdgeOne CLI 1.2.22+

## 安装 EdgeOne CLI

```bash
npm install -g edgeone
```

验证安装：

```bash
edgeone --version
```

## 本地开发

### 1. 安装依赖

```bash
yarn install
```

### 2. 启动本地开发服务器

```bash
edgeone pages dev
```

这会同时启动：
- 前端开发服务器（Nuxt）
- Node Functions 后端
- Edge Functions
- KV 存储模拟

所有服务运行在 `http://localhost:8088`

### 3. 配置环境变量（可选）

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

#### KV_BASE_URL 配置说明

- **本地开发**：如果需要连接远程 KV，设置为远程地址
  ```bash
  KV_BASE_URL=https://your-project.edgeone.app
  ```

- **生产环境**：留空或不设置，系统会自动从请求头中提取当前域名
  ```bash
  # KV_BASE_URL=
  ```

系统会按以下优先级确定 KV API 地址：
1. 环境变量 `KV_BASE_URL`（如果设置）
2. 自动检测当前请求的域名（推荐生产环境使用）

### 4. KV 存储

#### 本地模拟 KV
`edgeone pages dev` 会自动模拟 KV 存储，数据保存在本地，无需额外配置。

#### 使用远程 KV（可选）
如果需要使用线上 KV 数据进行调试：

```bash
edgeone pages link
```

按提示选择项目，CLI 会自动关联 KV 命名空间。

#### KV 命名空间
项目使用单一 KV 命名空间（需在 EdgeOne 控制台配置）：
- `PUSHER_KV` - 统一存储（使用 `config:` / `channels:` / `apps:` / `openids:` / `messages:` 前缀隔离数据）

#### 旧 KV 迁移
如果历史版本仍使用多个 KV 命名空间，部署新版后可以通过迁移接口完成数据迁移：

```bash
BUILD_KEY=Your-Strong-Passphrase KV_BASE_URL=https://your-domain.com \
  curl -X POST "$KV_BASE_URL/api/kv/migrate" -H "X-Internal-Key: $BUILD_KEY"
```

> 迁移只会同步最近 50 条消息历史，并重建对应索引。

如需检查是否仍存在旧 KV 数据，可访问：

```bash
curl https://your-domain.com/api/health-migration
```

## API 测试

### 测试初始化

```bash
curl -X POST http://localhost:8088/v1/init
```

### 测试推送

```bash
# 创建 SendKey（需要 Admin Token）
curl -X POST http://localhost:8088/v1/sendkeys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_TOKEN" \
  -d '{"name": "测试 SendKey"}'

# 推送消息
curl "http://localhost:8088/SCTxxxxx.send?title=测试&desp=内容"
```

## 常见问题

### 1. 端口被占用

确保端口 8088 未被占用：

```bash
lsof -i :8088
```

### 2. KV 数据

本地开发时，KV 数据存储在本地。使用 `edgeone pages link` 可以连接远程 KV。

### 3. 热重载

EdgeOne CLI 支持热重载，修改代码后会自动重启服务。

## 部署

### 构建

```bash
yarn build
```

### 部署到 EdgeOne

```bash
edgeone pages deploy
```

## 更多信息

- [EdgeOne Pages CLI 文档](https://edgeone.cloud.tencent.com/pages/document/162936923278893056)
