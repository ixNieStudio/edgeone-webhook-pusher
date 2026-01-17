# EdgeOne Webhook Pusher

> 🚀 免费白嫖的微信消息推送服务，一键部署到 EdgeOne Pages，无需服务器

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/ixNieStudio/edgeone-webhook-pusher)

> 本项目由 [Tencent EdgeOne](https://edgeone.ai) 提供 CDN 加速和安全防护赞助
> 
> [![Tencent EdgeOne](https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png)](https://edgeone.ai)

## 📸 产品截图

<table>
  <tr>
    <td><img src="docs/imgs/1.%20login.png" alt="登录页面" /></td>
    <td><img src="docs/imgs/2.%20home.png" alt="首页" /></td>
  </tr>
  <tr>
    <td align="center">登录页面</td>
    <td align="center">首页概览</td>
  </tr>
  <tr>
    <td><img src="docs/imgs/3.%20channels.png" alt="渠道管理" /></td>
    <td><img src="docs/imgs/4.%20apps.png" alt="应用管理" /></td>
  </tr>
  <tr>
    <td align="center">渠道管理</td>
    <td align="center">应用管理</td>
  </tr>
  <tr>
    <td><img src="docs/imgs/5.%20messages.png" alt="消息历史" /></td>
    <td><img src="docs/imgs/6.%20api-docs.png" alt="API 文档" /></td>
  </tr>
  <tr>
    <td align="center">消息历史</td>
    <td align="center">API 文档</td>
  </tr>
</table>

## ✨ 功能特性

- 🆓 **完全免费** - 部署在 EdgeOne Pages 免费套餐，无需付费
- ⚡ **一键部署** - 点击按钮即可部署，无需服务器、无需运维
- 📱 **微信推送** - 支持微信公众号模板消息和客服消息，消息直达微信
- 🔗 **Webhook 风格** - 简单 URL 调用，一行代码搞定推送
- 🔑 **多应用管理** - 为不同场景创建独立应用，互不干扰
- 📢 **单播/订阅** - 支持单播（个人通知）和订阅模式（群发通知）
- 📋 **模板消息** - 支持微信模板消息，突破 48 小时限制
- 🎛️ **Web 控制台** - 可视化管理界面，配置更简单
- 📊 **消息历史** - 完整的消息发送记录和状态追踪
- 🔒 **数据自主** - 数据存储在你自己的账户，完全可控
- 🌍 **全球加速** - EdgeOne 边缘节点，全球低延迟
- 🌓 **深色模式** - 支持 Light/Dark 主题切换

## 🎯 核心功能

### 渠道管理
- 支持微信公众号（测试号/正式号）
- 可视化配置指引，一步步教你如何配置
- 自动验证配置是否正确
- 支持多个渠道，灵活切换

### 应用管理
- **单播模式**：消息只发送给第一个绑定的用户，适合个人通知
- **订阅模式**：消息发送给所有绑定的用户，适合群发通知
- **普通消息**：客服消息，48 小时内可推送
- **模板消息**：无时间限制，推荐使用测试号自定义模板
- 每个应用独立的 Webhook URL
- 支持多个应用，互不干扰

### 用户绑定
- 生成绑定码，用户扫码或发送消息即可绑定
- 支持二维码绑定（认证服务号）
- 实时显示绑定状态
- 查看所有绑定用户信息

### 消息推送
- 简单的 Webhook API，支持 GET/POST 请求
- 支持浏览器直接访问发送
- 自动记录消息历史
- 实时查看推送状态

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

## 📖 使用指南

### 1. 申请微信测试号

访问 [微信公众平台测试号申请页面](https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login)，使用微信扫码登录即可获得测试号。

**为什么推荐测试号？**
- 可以自定义模板消息内容
- 突破客服消息的 48 小时限制
- 无需审核，立即可用
- 正式公众号已停止新申请模板消息

### 2. 创建渠道

在系统的「渠道管理」页面：
1. 点击「新建」按钮
2. 填入测试号的 AppID 和 AppSecret
3. 复制系统提供的服务器 URL 和 Token
4. 在微信测试号管理页面配置「接口配置信息」
5. 点击「验证配置」确认配置正确

### 3. 添加模板消息（推荐）

在测试号管理页面找到「模板消息接口」→「新增测试模板」：

**模板标题**：消息推送通知

**模板内容**：
```
标题：{{first.DATA}}
内容：{{keyword1.DATA}}
备注：{{remark.DATA}}
```

**字段说明**：
- `first` - 对应 Webhook 的 `title` 参数
- `keyword1` - 对应 Webhook 的 `desp` 参数
- `remark` - 备注信息（自动填充）

提交后会获得模板 ID，在创建应用时需要用到。

### 4. 创建应用

在「应用管理」页面：
1. 点击「新建」按钮
2. 选择刚才创建的渠道
3. 选择推送模式（单播/订阅）
4. 选择消息类型（推荐模板消息）
5. 填入模板 ID
6. 创建完成，获得 Webhook URL

### 5. 绑定用户

在应用详情页面：
1. 点击「生成绑定码」
2. 使用微信扫码或发送「绑定 XXXX」消息
3. 绑定成功后即可接收推送消息

### 6. 发送消息

使用应用详情页面提供的 Webhook URL：

```bash
# GET 请求
curl "https://your-domain.com/send/{appKey}?title=测试消息&desp=这是消息内容"

# POST 请求
curl -X POST "https://your-domain.com/send/{appKey}" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试消息","desp":"这是消息内容"}'

# 浏览器访问
https://your-domain.com/send/{appKey}?title=测试消息&desp=这是消息内容
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

- 🖥️ **服务器监控告警** - CPU、内存、磁盘使用率告警
- 🔔 **定时任务通知** - 备份完成、数据同步状态
- 🛒 **订单状态推送** - 新订单提醒、支付成功通知
- 📊 **数据报表推送** - 每日数据汇总、周报月报
- 🔐 **安全告警通知** - 异常登录、权限变更提醒
- 🤖 **IoT 设备推送** - 设备状态变化、传感器数据告警
- 📝 **博客更新通知** - 新文章发布、评论提醒
- 🎮 **游戏服务器** - 玩家上线、活动开始通知
- 💰 **价格监控** - 商品降价、股票涨跌提醒
- 🌡️ **天气预报** - 每日天气推送、极端天气预警

## 🔧 技术栈

- **前端**: Nuxt 4 + Vue 3 + TypeScript + Tailwind CSS
- **后端**: TypeScript + Koa + EdgeOne Node Functions
- **存储**: EdgeOne KV
- **部署**: EdgeOne Pages
- **UI**: Headless UI + Iconify

## 📊 项目特点

### 架构设计
- 前后端分离，API 清晰
- TypeScript 全栈，类型安全
- 响应式设计，支持移动端
- 深色模式，护眼舒适

### 性能优化
- EdgeOne 全球 CDN 加速
- KV 存储，毫秒级响应
- 按需加载，首屏快速
- 边缘计算，低延迟

### 安全性
- Admin Token 认证
- 数据加密存储
- HTTPS 全站加密
- 防重放攻击

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 更新日志

### 2026-01-17
- ✨ 新增使用指引教程，帮助新用户快速上手
- ✨ 增强模板消息配置，显示字段映射关系
- ✨ 实现单播模式绑定限制
- 🎨 优化绑定用户信息展示，添加绑定时间
- 🐛 修复多个 UI 细节问题

### 2026-01-16
- 🎨 全新 UI 主题系统，支持 Light/Dark 模式
- ✨ 新增消息历史记录功能
- 🔧 优化移动端适配

### 2026-01-15
- 🔨 TypeScript 全面重构
- ✨ 新增 API 文档页面
- 🐛 修复已知问题

### 2026-01-14
- 🎉 首个公开版本发布
- ✨ 基础功能实现

## ❓ 常见问题

### Q: 为什么推荐使用测试号？
A: 测试号可以自定义模板消息内容，突破 48 小时限制。正式公众号已停止新申请模板消息，只能使用客服消息（有 48 小时限制）。

### Q: 单播和订阅模式有什么区别？
A: 单播模式只发送给第一个绑定的用户，适合个人通知；订阅模式发送给所有绑定的用户，适合群发通知。

### Q: 模板消息和普通消息有什么区别？
A: 模板消息无时间限制，但需要在微信公众平台创建模板；普通消息（客服消息）有 48 小时限制，但无需创建模板。

### Q: 如何获取模板 ID？
A: 在微信测试号管理页面的「模板消息接口」中创建模板后，会显示模板 ID。

### Q: 部署后无法访问怎么办？
A: 请检查是否正确绑定了所有 KV 命名空间，并确保构建配置正确。

## 📄 开源协议

GPL-3.0

## 👨‍💻 作者

colin@ixNieStudio

## 🙏 致谢

- [Tencent EdgeOne](https://edgeone.ai) - 提供 CDN 加速和安全防护
- [Nuxt](https://nuxt.com) - 优秀的 Vue 框架
- [Tailwind CSS](https://tailwindcss.com) - 实用的 CSS 框架

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
