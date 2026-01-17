# EdgeOne Webhook Pusher

> 🚀 **0成本自建微信推送神器** - 白嫖 EdgeOne + 微信测试号，5分钟搞定专属推送服务

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?template=https://github.com/ixNieStudio/edgeone-webhook-pusher)

**🎯 在线体验：[https://webhook-pusher.ixnie.cn/](https://webhook-pusher.ixnie.cn/)** - 无需登录，快速体验所有功能

---

## 💡 为什么选择这个项目？

### 与主流方案对比

| 对比项 | 本项目 | Server酱 | 认证公众号 |
|--------|--------|----------|-----------|
| 💰 **成本** | **完全免费** | ¥49/年起 | 需认证费用 |
| 🔒 **数据归属** | **自建自托管** | 第三方托管 | 腾讯托管 |
| ⚡ **部署难度** | **一键部署（5分钟）** | 简单 | 复杂 |
| 📊 **推送限制** | **无限制** | 免费版有次数限制 | 48小时限制 |
| 🛠️ **自定义** | **完全可控** | 有限 | 有限 |
| 🔐 **数据安全** | **完全掌控** | 依赖第三方 | 依赖腾讯 |

### 核心优势

- ✅ **完全免费** - 白嫖 EdgeOne Pages 免费额度，永久免费使用
- ✅ **数据自托管** - 部署在自己账号下，数据完全掌控，安全可靠
- ✅ **一键部署** - 5分钟搞定，无需服务器、无需运维
- ✅ **微信测试号** - 用测试号就能满足所有需求，可自定义模板，突破48小时限制
- ✅ **无推送限制** - 想推多少推多少，没有任何次数限制
- ✅ **开源透明** - 代码完全开源，可审计、可二次开发

> 本项目由 [Tencent EdgeOne](https://edgeone.ai) 提供 CDN 加速和安全防护赞助
> 
> [![Tencent EdgeOne](https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png)](https://edgeone.ai)

## 📸 产品截图

<table>
  <tr>
    <td><img src="docs/imgs/wechat.jpg" alt="微信推送效果" /></td>
    <td><img src="docs/imgs/2.%20home.png" alt="首页" /></td>
  </tr>
  <tr>
    <td align="center">微信推送效果</td>
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
    <td><img src="docs/imgs/1.%20login.png" alt="登录页面" /></td>
  </tr>
  <tr>
    <td align="center">消息历史</td>
    <td align="center">登录页面</td>
  </tr>
</table>

## ✨ 功能特性

- 🆓 **完全免费** - 白嫖 EdgeOne Pages 免费额度，永久免费使用
- ⚡ **一键部署** - 点击按钮即可部署，无需服务器、无需运维
- 🎁 **体验模式** - 无需登录即可体验，快速了解所有功能
- 📱 **微信推送** - 支持微信公众号模板消息和客服消息，消息直达微信
- 🔗 **Webhook 风格** - 简单 URL 调用，一行代码搞定推送
- 🔑 **多应用管理** - 为不同场景创建独立应用，互不干扰
- 📢 **单播/订阅** - 支持单播（个人通知）和订阅模式（群发通知）
- 📋 **模板消息** - 支持微信模板消息，突破 48 小时限制
- 🎛️ **Web 控制台** - 可视化管理界面，配置更简单
- 📊 **消息历史** - 完整的消息发送记录和状态追踪
- 🏠 **数据自托管** - 数据存储在你自己的账户，完全可控
- 🌍 **全球加速** - EdgeOne 边缘节点，全球低延迟
- 🌓 **深色模式** - 支持 Light/Dark 主题切换

## 🎯 适用场景

### 🏠 HomeLab / 家庭实验室
- **NAS 通知** - 群晖/威联通下载完成、备份状态、存储空间告警
- **路由器监控** - OpenWrt 设备上线、网络断线、流量统计
- **智能家居** - Home Assistant 传感器告警、设备状态变化
- **树莓派项目** - 环境监控、摄像头监控、定时任务结果

### 💻 开发运维
- **CI/CD 通知** - GitHub Actions 部署成功/失败、构建结果
- **服务器监控** - CPU/内存/磁盘告警、服务异常通知
- **错误追踪** - Sentry 生产环境报错、异常堆栈推送
- **定时任务** - Cron 任务执行结果、数据处理完成

### 🤖 自动化工作流
- **爬虫通知** - 数据采集完成、价格监控、库存变化
- **签到脚本** - 青龙面板签到结果、积分变化
- **RSS 监控** - 订阅源更新、关键词匹配
- **API 监控** - 接口性能、错误率、第三方服务状态

## 💬 用户案例

> 欢迎提交你的使用案例！在 [GitHub Discussions](https://github.com/ixNieStudio/edgeone-webhook-pusher/discussions) 分享你的创意场景

**案例 1：群晖 NAS 下载完成通知**
```bash
# 在 Download Station 完成脚本中添加
curl "https://your-domain.com/send/{key}?title=下载完成&desp=${TR_TORRENT_NAME}"
```

**案例 2：服务器 CPU 告警**
```bash
# 在监控脚本中添加
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
if [ ${CPU_USAGE%.*} -gt 80 ]; then
    curl "https://your-domain.com/send/{key}?title=CPU告警&desp=CPU使用率${CPU_USAGE}%"
fi
```

**案例 3：GitHub Actions 部署通知**
```yaml
- name: 通知部署结果
  run: |
    curl "https://your-domain.com/send/${{ secrets.WEBHOOK_KEY }}?title=部署成功&desp=项目已上线"
```
- 📋 **模板消息** - 支持微信模板消息，突破 48 小时限制
- 🎛️ **Web 控制台** - 可视化管理界面，配置更简单
- 📊 **消息历史** - 完整的消息发送记录和状态追踪
- 🏠 **数据自托管** - 数据存储在你自己的账户，完全可控
- 🌍 **全球加速** - EdgeOne 边缘节点，全球低延迟
- 🌓 **深色模式** - 支持 Light/Dark 主题切换

## 🎯 核心功能

### 🎁 体验模式（NEW）
- 无需登录即可体验
- 自动配置测试环境
- 快速了解所有功能
- 仅供体验使用

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

### 🎁 方式一：在线体验（推荐新手）

**无需部署，立即体验：[https://webhook-pusher.ixnie.cn/](https://webhook-pusher.ixnie.cn/)**

- ✅ 无需登录，打开即用
- ✅ 体验所有功能
- ✅ 快速了解产品
- ✅ 仅供体验使用

体验满意后，再决定是否自己部署！

---

### ⚡ 方式二：一键部署（5分钟搞定）

**第一步：点击部署按钮**

点击页面顶部的 **Deploy to EdgeOne** 按钮，登录/注册 EdgeOne 账号

**第二步：绑定 KV 命名空间**

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

## 🔌 集成示例

### 群晖 NAS 集成

#### 1. Download Station 下载完成通知

在 Download Station 设置中添加完成脚本：

```bash
#!/bin/bash
# 保存为 /volume1/scripts/download-notify.sh

TITLE="下载完成"
DESP="文件：$1 已下载完成"
WEBHOOK_URL="https://your-domain.com/send/{appKey}"

curl "${WEBHOOK_URL}?title=${TITLE}&desp=${DESP}"
```

#### 2. 任务计划监控

在「控制面板」→「任务计划」中创建用户定义的脚本：

```bash
#!/bin/bash
# 磁盘空间监控

USAGE=$(df -h /volume1 | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    curl "https://your-domain.com/send/{appKey}?title=磁盘空间告警&desp=磁�盘使用率已达${USAGE}%"
fi
```

### OpenWrt 路由器集成

#### 1. 设备上线通知

在「系统」→「启动项」→「本地启动脚本」中添加：

```bash
# /etc/rc.local

# 监控设备上线
cat > /tmp/device-monitor.sh << 'EOF'
#!/bin/sh
WEBHOOK_URL="https://your-domain.com/send/{appKey}"

while true; do
    # 检测新设备
    for mac in $(cat /tmp/dhcp.leases | awk '{print $2}'); do
        if ! grep -q "$mac" /tmp/known_devices; then
            hostname=$(cat /tmp/dhcp.leases | grep "$mac" | awk '{print $4}')
            curl "${WEBHOOK_URL}?title=新设备上线&desp=设备 ${hostname} (${mac}) 已连接"
            echo "$mac" >> /tmp/known_devices
        fi
    done
    sleep 60
done
EOF

chmod +x /tmp/device-monitor.sh
/tmp/device-monitor.sh &
```

#### 2. 网络断线告警

```bash
#!/bin/sh
# 保存为 /root/network-monitor.sh

WEBHOOK_URL="https://your-domain.com/send/{appKey}"

while true; do
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        curl "${WEBHOOK_URL}?title=网络异常&desp=路由器无法连接到互联网"
    fi
    sleep 300
done
```

### Home Assistant 集成

在 `configuration.yaml` 中添加：

```yaml
# 通知配置
notify:
  - name: webhook_pusher
    platform: rest
    resource: https://your-domain.com/send/{appKey}
    method: POST
    data:
      title: "{{ title }}"
      desp: "{{ message }}"

# 自动化示例：门窗告警
automation:
  - alias: "门窗告警"
    trigger:
      - platform: state
        entity_id: binary_sensor.front_door
        to: "on"
    condition:
      - condition: time
        after: "22:00:00"
        before: "06:00:00"
    action:
      - service: notify.webhook_pusher
        data:
          title: "安全告警"
          message: "前门在夜间被打开，请注意安全"
```

### Docker 容器监控

使用 Docker 事件监控：

```bash
#!/bin/bash
# docker-monitor.sh

WEBHOOK_URL="https://your-domain.com/send/{appKey}"

docker events --filter 'type=container' --format '{{json .}}' | while read event; do
    status=$(echo $event | jq -r '.status')
    name=$(echo $event | jq -r '.Actor.Attributes.name')
    
    if [ "$status" = "die" ] || [ "$status" = "stop" ]; then
        curl "${WEBHOOK_URL}?title=容器停止&desp=容器 ${name} 已停止运行"
    fi
done
```

### Python 脚本集成

```python
import requests

def send_notification(title, content):
    """发送通知"""
    url = "https://your-domain.com/send/{appKey}"
    params = {
        "title": title,
        "desp": content
    }
    response = requests.get(url, params=params)
    return response.json()

# 使用示例
if __name__ == "__main__":
    # 爬虫完成通知
    send_notification("爬虫任务完成", "已成功采集 1000 条数据")
    
    # 异常告警
    try:
        # 你的代码
        pass
    except Exception as e:
        send_notification("程序异常", f"错误信息：{str(e)}")
```

### Node.js 集成

```javascript
const axios = require('axios');

async function sendNotification(title, content) {
    const url = 'https://your-domain.com/send/{appKey}';
    const response = await axios.post(url, {
        title: title,
        desp: content
    });
    return response.data;
}

// 使用示例
async function main() {
    // 部署完成通知
    await sendNotification('部署完成', '项目已成功部署到生产环境');
    
    // 错误捕获
    process.on('uncaughtException', async (error) => {
        await sendNotification('程序崩溃', `错误信息：${error.message}`);
    });
}
```

### Shell 脚本集成

```bash
#!/bin/bash
# notify.sh - 通用通知脚本

WEBHOOK_URL="https://your-domain.com/send/{appKey}"

function send_notification() {
    local title="$1"
    local content="$2"
    curl -s "${WEBHOOK_URL}?title=${title}&desp=${content}"
}

# 使用示例

# 备份脚本
if tar -czf backup.tar.gz /data; then
    send_notification "备份成功" "数据备份已完成"
else
    send_notification "备份失败" "数据备份过程中出现错误"
fi

# 磁盘监控
USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    send_notification "磁盘告警" "磁盘使用率：${USAGE}%"
fi
```

### GitHub Actions 集成

在 `.github/workflows/deploy.yml` 中添加：

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy
        run: |
          # 你的部署脚本
          echo "Deploying..."
      
      - name: Notify Success
        if: success()
        run: |
          curl "https://your-domain.com/send/${{ secrets.WEBHOOK_KEY }}?title=部署成功&desp=项目已成功部署到生产环境"
      
      - name: Notify Failure
        if: failure()
        run: |
          curl "https://your-domain.com/send/${{ secrets.WEBHOOK_KEY }}?title=部署失败&desp=部署过程中出现错误，请检查日志"
```

### Prometheus AlertManager 集成

在 `alertmanager.yml` 中配置：

```yaml
receivers:
  - name: 'webhook-pusher'
    webhook_configs:
      - url: 'https://your-domain.com/send/{appKey}'
        send_resolved: true
        http_config:
          follow_redirects: true

route:
  receiver: 'webhook-pusher'
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
```

## 💡 应用场景

### 🏠 HomeLab / 家庭实验室

#### NAS 存储管理
- **群晖/威联通 NAS** - 下载完成、备份状态、存储空间告警、RAID 状态监控
- **TrueNAS/Unraid** - 磁盘健康检查、ZFS 快照完成、Docker 容器状态
- **Transmission/qBittorrent** - BT 下载完成、做种提醒
- **Plex/Jellyfin/Emby** - 新媒体添加、转码完成、用户观看统计
- **Nextcloud/Seafile** - 文件同步状态、共享链接访问通知
- **Rclone** - 云盘同步完成、挂载状态异常

```bash
# 群晖下载完成通知
curl "https://your-domain.com/send/{appKey}?title=下载完成&desp=${TR_TORRENT_NAME}"
```

#### 软路由/OpenWrt
- **设备上线/下线** - 家人回家/离家提醒、陌生设备接入告警
- **网络监控** - 断网告警、网速异常、流量统计、带宽占用
- **AdGuard Home/Pi-hole** - 广告拦截统计、DNS 查询异常
- **端口转发/DDNS** - 外网访问异常、IP 地址变更
- **固件更新** - 新版本发布、更新完成通知
- **VPN 状态** - WireGuard/OpenVPN 连接状态

```bash
# 设备上线通知
curl "https://your-domain.com/send/{appKey}?title=设备上线&desp=iPhone已连接到家庭网络"
```

#### 树莓派项目
- **环境监控** - 温湿度、气压、空气质量传感器数据
- **摄像头监控** - 移动侦测、人脸识别、车牌识别
- **GPIO 控制** - 继电器状态、开关触发通知
- **系统监控** - CPU 温度、内存使用、SD 卡寿命
- **定时任务** - 自动浇花、喂食器、定时拍照

#### 智能家居集成
- **Home Assistant** - 自动化场景触发、设备状态变化、传感器告警
- **米家/HomeKit** - 门窗传感器、人体传感器、温湿度监控
- **ESPHome** - 自制 IoT 设备状态上报
- **Zigbee2MQTT** - 设备电量低、离线告警
- **Node-RED** - 复杂自动化流程通知

```bash
# Home Assistant 门窗告警
curl "https://your-domain.com/send/{appKey}?title=安全告警&desp=前门在夜间被打开"
```

### 🖥️ 服务器运维

#### 系统监控
- **Prometheus/Grafana** - 指标告警、阈值触发
- **Zabbix/Nagios** - 主机状态、服务可用性
- **Uptime Kuma** - 网站可用性监控、SSL 证书到期
- **Netdata** - 实时性能监控、异常检测
- **Glances** - 系统资源使用率告警

#### 日志监控
- **ELK Stack** - 错误日志聚合、异常模式检测
- **Loki/Promtail** - 日志查询告警
- **Fail2ban** - 暴力破解尝试、IP 封禁通知
- **Logwatch** - 每日日志摘要

#### 备份与恢复
- **Restic/Borg** - 备份任务完成/失败
- **Duplicati** - 增量备份状态
- **Rsync** - 文件同步完成
- **数据库备份** - MySQL/PostgreSQL 备份状态

```bash
# 备份完成通知
curl "https://your-domain.com/send/{appKey}?title=备份完成&desp=数据库备份成功，大小：2.5GB"
```

### 🤖 自动化工作流

#### n8n/Zapier/IFTTT 集成
- **工作流触发** - 复杂自动化流程完成通知
- **数据同步** - 跨平台数据同步状态
- **定时任务** - 定期数据处理、报表生成
- **Webhook 转发** - 第三方服务事件通知

#### RSS 监控
- **RSSHub** - 订阅源更新、关键词匹配
- **Huginn** - 网页变化监控、价格追踪
- **Miniflux/FreshRSS** - 新文章推送、重要内容提醒
- **社交媒体** - Twitter/微博/B站 UP主更新

```bash
# RSS 新文章通知
curl "https://your-domain.com/send/{appKey}?title=新文章&desp=阮一峰的周刊更新了"
```

#### 爬虫与数据采集
- **Scrapy/BeautifulSoup** - 爬虫任务完成、数据更新
- **Selenium** - 自动化测试结果、截图完成
- **价格监控** - 商品降价、库存变化（京东、淘宝、Steam）
- **票务监控** - 演唱会、火车票、机票余票提醒
- **招聘信息** - 新职位发布、关键词匹配

#### 签到与自动化
- **每日签到** - 论坛、APP、积分系统自动签到结果
- **青龙面板** - 京东签到、淘宝签到、各类脚本执行结果
- **GitHub Actions** - 定时任务执行、自动化脚本运行

```bash
# 签到成功通知
curl "https://your-domain.com/send/{appKey}?title=签到成功&desp=今日积分+10，连续签到7天"
```

### � 开发与 CI/CD

#### 代码仓库
- **GitHub/GitLab** - Push、PR、Issue、Release 通知
- **代码审查** - Review 请求、评论回复
- **Actions/Pipeline** - 构建成功/失败、测试结果
- **依赖更新** - Dependabot、Renovate 更新提醒

#### 持续集成
- **Jenkins** - 构建状态、部署完成
- **Travis CI/Circle CI** - 测试通过/失败
- **Docker Hub** - 镜像构建完成、自动部署
- **Vercel/Netlify** - 网站部署状态

```bash
# GitHub Actions 部署通知
curl "https://your-domain.com/send/{appKey}?title=部署成功&desp=项目已部署到生产环境"
```

#### 错误追踪
- **Sentry** - 生产环境错误、异常堆栈
- **Bugsnag/Rollbar** - 崩溃报告、性能问题
- **日志聚合** - 错误率突增、异常模式

### 🛒 电商与业务

- **订单管理** - 新订单、支付成功、发货通知
- **库存监控** - 库存不足、缺货告警
- **用户行为** - 新用户注册、VIP 购买、退款申请
- **营销活动** - 活动开始、优惠券发放、限时抢购
- **数据异常** - 销售额异常、流量突增/骤降

### 📊 数据分析与监控

#### 网站分析
- **Google Analytics** - 流量异常、转化率变化
- **百度统计/友盟** - 访问量统计、用户行为分析
- **Matomo/Plausible** - 隐私友好的访问统计

#### 爬虫监控
- **目标网站变化** - 页面结构改变、反爬策略更新
- **数据质量** - 数据完整性检查、异常值检测
- **采集进度** - 任务完成度、剩余时间估算

#### API 监控
- **接口性能** - 响应时间、错误率、QPS
- **第三方服务** - API 配额使用、限流告警
- **Webhook 接收** - 第三方回调通知

```bash
# API 异常告警
curl "https://your-domain.com/send/{appKey}?title=API告警&desp=接口错误率超过5%"
```

### 🔐 安全与隐私

- **登录监控** - 异常登录、多地登录、暴力破解
- **权限变更** - 管理员权限变更、敏感操作审计
- **防火墙告警** - 异常访问、DDoS 攻击、端口扫描
- **文件完整性** - 敏感文件修改、配置文件变更
- **证书管理** - SSL 证书到期、Let's Encrypt 续期
- **密码泄露** - Have I Been Pwned 检测

### 💰 金融与投资

- **股票监控** - 价格到达目标、涨跌幅告警、大单成交
- **加密货币** - 币价波动、交易完成、钱包余额变化
- **汇率监控** - 汇率达到目标价位、套利机会
- **基金净值** - 每日净值更新、收益统计
- **账单提醒** - 信用卡还款、账单到期、自动扣款

```bash
# 股票价格告警
curl "https://your-domain.com/send/{appKey}?title=股票告警&desp=茅台股价突破2000元"
```

### 🎮 娱乐与生活

#### 游戏相关
- **Steam** - 游戏打折、愿望单降价、库存补货
- **Epic Games** - 免费游戏、限时优惠
- **游戏服务器** - 玩家上线、服务器状态、活动开始
- **直播提醒** - Twitch/B站/斗鱼 主播开播

#### 内容创作
- **博客/公众号** - 新文章发布、评论回复、阅读量统计
- **视频处理** - FFmpeg 转码完成、上传成功
- **图片处理** - 批量压缩完成、水印添加
- **自动发布** - 定时发布、跨平台同步

#### 生活服务
- **天气预报** - 每日天气、极端天气预警、空气质量
- **快递物流** - 包裹签收、物流更新、快递到达
- **日程提醒** - 会议、约会、生日、纪念日
- **健康监测** - 运动目标、体重记录、用药提醒
- **公交地铁** - 末班车提醒、线路调整

```bash
# 快递到达通知
curl "https://your-domain.com/send/{appKey}?title=快递到达&desp=您的包裹已到达菜鸟驿站"
```

### 🔬 极客实验项目

- **机器学习** - 模型训练完成、准确率达标、GPU 使用率
- **区块链节点** - 同步状态、区块高度、交易确认
- **挖矿监控** - 算力变化、收益统计、设备温度
- **3D 打印** - 打印完成、耗材不足、打印失败
- **无人机/机器人** - 电量低、任务完成、异常状态
- **业余无线电** - 信号质量、通联记录、比赛提醒

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

欢迎参与项目建设！我们需要你的帮助让这个项目变得更好。

### 💻 代码贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request


### 📝 内容贡献

- **使用案例**：在 [GitHub Discussions](https://github.com/ixNieStudio/edgeone-webhook-pusher/discussions) 分享你的使用场景
- **教程文档**：制作详细教程、避坑指南，被采纳后将在 README 置顶推荐
- **问题反馈**：提交 Bug 报告、功能建议，帮助改进产品


## 💬 社区交流

- **GitHub Discussions**：[项目讨论区](https://github.com/ixNieStudio/edgeone-webhook-pusher/discussions)
- **问题反馈**：[提交 Issue](https://github.com/ixNieStudio/edgeone-webhook-pusher/issues)
- **功能建议**：欢迎在 Issues 中提出你的想法

## 📊 项目标签

`WeChat-push` `EdgeOne` `free` `self-hosted` `NAS` `HomeLab` `serverless` `webhook` `notification` `open-source`

## 📝 更新日志

### 2026-01-17
- ✨ 新增体验模式，无需登录即可试用
- ✨ 新增使用指引教程，帮助新用户快速上手
- ✨ 增强模板消息配置，显示字段映射关系
- ✨ 实现单播模式绑定限制
- ✨ 添加完整的 Webhook 使用示例（cURL/POST/浏览器）
- 🎨 优化绑定用户信息展示，添加绑定时间
- 🎨 优化 README 文档，添加对比表和用户案例
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

---

## 🔍 SEO 关键词

**核心功能**: 微信推送 | 免费微信推送服务 | 自建微信推送 | EdgeOne 微信推送 | 消息推送 | Webhook | 模板消息 | 客服消息 | 单播订阅 | 免费部署 | 一键部署 | Serverless | 数据自托管 | Server酱替代品

**HomeLab**: NAS 通知 | 群晖 | 威联通 | OpenWrt | 路由器监控 | 树莓派 | 智能家居 | Home Assistant | 米家 | HomeKit | 下载完成 | 备份通知 | 设备上线 | 网络监控 | HomeLab 通知中心

**开发运维**: GitHub Actions | CI/CD | Docker 监控 | 容器监控 | Jenkins | 部署通知 | 错误追踪 | Sentry | API 监控 | 日志分析 | Prometheus | Grafana | SSL 证书 | 服务器监控

**自动化**: RSS 监控 | 爬虫通知 | 签到脚本 | 青龙面板 | 价格监控 | n8n | Zapier | IFTTT | 定时任务 | 自动化工作流

**媒体服务**: Plex | Jellyfin | Emby | Transmission | qBittorrent | Rclone | Nextcloud

**技术栈**: `#Nuxt` `#Vue3` `#TypeScript` `#EdgeOne` `#Serverless` `#Webhook` `#WeChat` `#HomeLab` `#NAS` `#OpenWrt` `#SmartHome` `#IoT` `#Docker` `#CI/CD` `#Automation` `#SelfHosted` `#OpenSource`

---

⭐ **如果这个项目对你有帮助，请给个 Star 支持一下！**

💬 **有问题或建议？欢迎在 [GitHub Discussions](https://github.com/ixNieStudio/edgeone-webhook-pusher/discussions) 交流！**
