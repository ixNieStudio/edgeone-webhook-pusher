<p align="center">
  <img src="docs/imgs/logo.png" alt="EdgeOne Webhook Pusher" width="240" />
</p>

<h1 align="center">EdgeOne Webhook Pusher</h1>

<p align="center">基于 EdgeOne 边缘能力的消息推送服务</p>

> 🚀 **0成本自建微信推送** - 白嫖EdgeOne + 微信测试号，5分钟部署专属推送服务

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/ixNieStudio/edgeone-webhook-pusher)

**🎯 在线体验**：[https://webhook-pusher.ixnie.cn/](https://webhook-pusher.ixnie.cn/) （仅供体验使用）

---

## 💡 为什么选它？

| 对比项 | 本项目 | Server酱 | 认证公众号 |
|--------|--------|----------|-----------|
| � 成本 | **完全免费** | ¥49/年起 | 需认证费 |
| 🔒 数据归属 | **自建自托管** | 第三方托管 | 腾讯托管 |
| ⚡ 部署难度 | **5分钟一键部署** | 简单 | 复杂 |
| 📊 推送限制 | **无限制** | 免费版有限 | 48小时限制 |
| 🛠️ 自定义 | **完全可控** | 有限 | 有限 |

**核心卖点**：EdgeOne免费额度 + 微信测试号 = 0成本永久使用 + 数据完全自己掌控

> 由 [Tencent EdgeOne](https://edgeone.ai) 提供全球CDN加速

---

## 📸 产品截图

<table>
  <tr>
    <td><img src="docs/imgs/wechat.jpg" alt="微信推送效果" /></td>
    <td><img src="docs/imgs/2.%20home.png" alt="首页" /></td>
    <td><img src="docs/imgs/3.%20channels.png" alt="渠道管理" /></td>
  </tr>
  <tr>
    <td align="center">微信推送效果</td>
    <td align="center">首页概览</td>
    <td align="center">渠道管理</td>
  </tr>
  <tr>
    <td><img src="docs/imgs/4.%20apps.png" alt="应用管理" /></td>
    <td><img src="docs/imgs/5.%20messages.png" alt="消息历史" /></td>
    <td><img src="docs/imgs/1.%20login.png" alt="登录页面" /></td>
  </tr>
  <tr>
    <td align="center">应用管理</td>
    <td align="center">消息历史</td>
    <td align="center">登录页面</td>
  </tr>
</table>

---

## ✨ 核心功能

- 🆓 **完全免费**：无推送次数/时间限制
- ⚡ **极速部署**：EdgeOne一键部署，无需服务器
- 📡 **Webhook调用**：一行代码/浏览器直接推送
- 📱 **多渠道支持**：微信公众号、企业微信、钉钉、飞书
- 🎛️ **可视化管理**：Web界面管理渠道/应用/历史
- 🏠 **数据自托管**：部署在个人账号，安全可控
- 🎁 **体验模式**：免登录试用全部功能
- 🌍 **全球加速**：EdgeOne边缘节点低延迟

---

## 🎯 适用场景

**HomeLab/智能家居**：NAS下载通知、路由器监控、HomeAssistant告警、树莓派传感器  
**开发运维**：CI/CD通知、服务器监控、Docker告警、错误提醒  
**自动化工作流**：爬虫结果、签到脚本、RSS订阅、价格监控  
**生活服务**：快递提醒、日程通知、设备上线

---

## 🚀 快速开始

### 方式1：在线体验
访问 [https://webhook-pusher.ixnie.cn/](https://webhook-pusher.ixnie.cn/)，免部署体验全部功能

### 方式2：一键部署（5分钟）

1. 点击顶部「Deploy to EdgeOne」按钮，登录EdgeOne账号
2. 绑定5个KV命名空间：`CONFIG_KV`、`CHANNELS_KV`、`APPS_KV`、`OPENIDS_KV`、`MESSAGES_KV`
3. 配置构建参数（Root: `/`，Output: `dist`，Build: `yarn build`）
4. **⚠️ 重要：创建项目时就配置环境变量**
   - `KV_BASE_URL=https://your-custom-domain.com`
   - 如果使用 EdgeOne 默认域名，则设置为：`KV_BASE_URL=https://your-project.edgeone.cool`
   - `BUILD_KEY=<复杂口令，建议至少 20 位，包含大小写、数字、符号>`

**BUILD_KEY 设置建议：**

- 不要求 64 位十六进制
- 系统运行时只要求它非空，且 Node Functions 与 Edge Functions 配置完全一致
- 出于安全考虑，仍建议使用难猜的复杂口令

> 💡 **为什么需要配置 KV_BASE_URL？**  
> EdgeOne Node Functions 需要通过 Edge Functions 访问 KV 存储。直接访问 `/send/*` 接口时，系统无法自动检测到公共域名，必须手动配置环境变量指定完整的域名地址。

> 💡 **为什么必须配置 BUILD_KEY？**  
> Node Functions 通过 `/api/kv/*` 访问 Edge Functions 中转层，Edge Functions 会校验 `X-Internal-Key`。本项目已统一改为只使用环境变量，不再在构建时生成或注入内部密钥文件。为降低配置门槛，运行时不再限制必须是 64 位十六进制，只要求两端一致。

### 环境变量说明

| 变量名 | 必填 | 用途 |
|--------|------|------|
| `KV_BASE_URL` | 是 | Node Functions 访问站点公开域名 |
| `BUILD_KEY` | 是 | Node Functions 与 Edge Functions 共用的内部鉴权密钥 |

### 部署校验

部署完成后，先检查健康接口：

```bash
curl https://your-domain.com/api/health
```

正常情况下你应该看到：

```json
{
  "success": true,
  "healthy": true,
  "ready": true,
  "requestOrigin": "https://your-domain.com",
  "hasBuildKeyEnv": true,
  "summary": {
    "errorCount": 0,
    "warningCount": 0
  },
  "env": {
    "BUILD_KEY": {
      "present": true,
      "ok": true
    },
    "KV_BASE_URL": {
      "present": true,
      "ok": true,
      "matchesRequestOrigin": true
    }
  },
  "kv": {
    "systemConfig": {
      "initialized": true
    }
  },
  "routes": {
    "kvProxy": {
      "ok": true
    },
    "nodeInitStatus": {
      "ok": true,
      "initialized": true
    }
  }
}
```

`/api/health` 现在会同时检查：

- 必填环境变量是否齐全：`BUILD_KEY`、`KV_BASE_URL`
- 5 个 KV 绑定是否存在且可读
- `CONFIG_KV` 中的系统配置是否已初始化
- ` /api/kv/config ` 代理路由是否正常
- ` /v1/init/status ` Node Functions 端到端链路是否正常

常见判定：

- `healthy=false`：说明部署配置或运行链路有硬错误，优先看 `summary.errors`
- `ready=false` 且 `healthy=true`：通常说明系统还没初始化，例如 `config` 尚未写入 `CONFIG_KV`
- `env.KV_BASE_URL.matchesRequestOrigin=false`：说明当前访问域名和配置的 `KV_BASE_URL` 不是同一个，适合作为诊断提示，不一定是故障

### Initialization guide

The Node Functions layer exposes a light-weight initialization flow that must run once before the admin UI accepts logins. The UI (see `app/stores/auth.ts`) calls the same endpoints so that it can automatically show the setup screen on a fresh deployment.

1. **Check status**: `GET /v1/init/status` returns `{ "initialized": false }` until the system is primed.
2. **Run the initializer once**:
   ```bash
   curl -X POST https://your-domain.com/v1/init
   ```
   The response payload looks like:
   ```json
   {
     "code": 0,
     "message": "Initialization successful. Please save your Admin Token securely.",
     "data": {
       "adminToken": "deploy-generated-admin-token"
     }
   }
   ```
3. **Store the Admin Token** securely. The token can be pasted into the login page or included as `Authorization: Bearer <token>` when calling admin-only routes. The SPA keeps the token in `localStorage` after login.

Once initialization completes, `/v1/init/status` flips to `{ "initialized": true }`, and the one-time setup screen disappears. The endpoint refuses repeated initialization attempts, so keep the admin token safe.

### 使用流程

#### 微信公众号/企业微信

1. **申请测试号**：访问 [微信测试号申请页](https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login)，扫码获取AppID/AppSecret
2. **创建渠道**：填入测试号信息，配置服务器URL和Token
3. **创建应用**：选择推送模式（单播/订阅）、消息类型，填入模板ID
4. **绑定用户**：生成绑定码，微信扫码完成绑定
5. **发送消息**：
   ```bash
   # GET请求
   curl "https://your-domain.com/send/{appKey}?title=标题&desp=内容"

   # POST请求
   curl -X POST "https://your-domain.com/send/{appKey}" \
     -H "Content-Type: application/json" \
     -d '{"title":"标题","desp":"内容"}'
   ```

#### 钉钉群机器人

1. **创建机器人**：在钉钉群设置中添加自定义机器人，获取 Webhook URL
2. **配置安全设置**（可选）：
   - 加签方式：获取密钥（secret），系统自动生成 HMAC-SHA256 签名
   - 关键词方式：设置关键词，消息中需包含关键词
3. **创建渠道**：选择「钉钉」类型，填入 Webhook URL 和密钥（如有）
4. **创建应用**：关联钉钉渠道，获取应用密钥（appKey）
5. **发送消息**：
   ```bash
   # 基础推送
   curl "https://your-domain.com/send/{appKey}?title=标题&desp=内容"

   # @指定成员（需在消息中传入 atMobiles）
   curl -X POST "https://your-domain.com/send/{appKey}" \
     -H "Content-Type: application/json" \
     -d '{"title":"标题","desp":"内容","atMobiles":["13800138000"]}'
   ```

#### 飞书群机器人

1. **创建机器人**：在飞书群设置中添加自定义机器人，获取 Webhook URL
2. **配置签名验证**（可选）：启用签名验证，获取密钥（secret）
3. **创建渠道**：选择「飞书」类型，填入 Webhook URL 和密钥（如有）
4. **创建应用**：关联飞书渠道，获取应用密钥（appKey）
5. **发送消息**：
   ```bash
   # 基础推送
   curl "https://your-domain.com/send/{appKey}?title=标题&desp=内容"

   # POST请求
   curl -X POST "https://your-domain.com/send/{appKey}" \
     -H "Content-Type: application/json" \
     -d '{"title":"标题","desp":"内容"}'
   ```

---

## 🔌 集成示例

### 群晖NAS下载通知
```bash
curl "https://your-domain.com/send/{appKey}?title=下载完成&desp=${TR_TORRENT_NAME}"
```

### GitHub Actions部署通知
```yaml
- name: 部署通知
  run: curl "https://your-domain.com/send/${{ secrets.WEBHOOK_KEY }}?title=部署成功&desp=项目已上线"
```

### Home Assistant告警
```yaml
notify:
  - name: webhook_pusher
    platform: rest
    resource: https://your-domain.com/send/{appKey}
    method: POST
    data:
      title: "{{ title }}"
      desp: "{{ message }}"
```

### 服务器监控
```bash
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
[ ${CPU_USAGE%.*} -gt 80 ] && curl "https://your-domain.com/send/{appKey}?title=CPU告警&desp=使用率${CPU_USAGE}%"
```

---

## 🔐 管理员密码自定义

系统支持自定义管理员密码功能，让您可以设置易于记忆但符合安全要求的密码。

### 密码复杂度要求

为确保系统安全，自定义密码必须满足以下要求：

- ✅ **长度**：至少 12 个字符
- ✅ **大写字母**：包含至少一个大写字母 (A-Z)
- ✅ **小写字母**：包含至少一个小写字母 (a-z)
- ✅ **数字**：包含至少一个数字 (0-9)
- ✅ **特殊字符**：包含至少一个特殊字符 (!@#$%^&*()_+-=[]{}|;:,.<>?)

**示例有效密码**：`MySecure@Pass123`、`Admin#2024Strong`

### 使用方法

1. **登录管理后台**：使用当前管理员令牌登录
2. **进入设置页面**：点击右上角设置图标
3. **重置密码**：
   - 选择「自定义密码」选项
   - 输入新密码（需满足复杂度要求）
   - 再次输入确认密码
   - 系统会实时显示密码强度和复杂度检查结果
4. **确认重置**：点击「确认重置」按钮
5. **重新登录**：使用新密码登录系统

### 向后兼容性

- 🔄 **自动生成模式**：如果不选择自定义密码，系统仍会自动生成安全的随机令牌（保持原有行为）
- 🔒 **即时生效**：密码重置后，旧令牌立即失效，需使用新密码重新登录
- 📱 **前端兼容**：旧版本前端仍可正常使用自动生成模式

### 安全提示

- ⚠️ **妥善保管**：请务必记住您的自定义密码，系统不提供密码找回功能
- 🔐 **定期更换**：建议定期更换管理员密码以提高安全性
- 🚫 **避免弱密码**：不要使用常见密码或个人信息作为密码

---

## ❓ 常见问题

**Q: 测试号有什么优势？**  
A: 自定义模板、突破48小时限制、免审核，比正式号更灵活

**Q: 单播和订阅的区别？**  
A: 单播推给首个绑定用户（个人），订阅推给所有绑定用户（群组）

**Q: EdgeOne免费额度够用吗？**  
A: 每月100GB流量 + 100万次请求，个人使用完全够

**Q: 忘记自定义密码怎么办？**  
A: 需要通过 EdgeOne 控制台的 KV 存储直接修改配置，或重新部署项目

**Q: 密码复杂度要求可以调整吗？**  
A: 密码复杂度要求是为了保护系统安全而设定的，不建议降低要求

---

## 🤝 参与贡献

- 📝 提交Issue/PR：[GitHub Issues](https://github.com/ixNieStudio/edgeone-webhook-pusher/issues)
- 💬 交流讨论：[GitHub Discussions](https://github.com/ixNieStudio/edgeone-webhook-pusher/discussions)
- 🎁 分享案例：欢迎分享你的使用场景

---

## 📄 开源协议

GPL-3.0 License

---

**关键词**：微信推送 | EdgeOne | Serverless | 数据自托管 | Server酱替代 | NAS通知 | 群晖 | 服务器监控 | CI/CD | HomeAssistant | 智能家居 | 免费推送
