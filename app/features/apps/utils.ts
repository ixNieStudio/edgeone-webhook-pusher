import type { AppMessageProfile, AuthProfileDetail, DeliveryType, ManagedAppLiteDetail, MessageRenderer } from '~/types';

export function isWebhookType(type: DeliveryType) {
  return type === 'dingtalk' || type === 'feishu';
}

export function deliveryLabel(type: DeliveryType) {
  return {
    wechat: '微信公众号',
    work_wechat: '企业微信',
    dingtalk: '钉钉 Webhook',
    feishu: '飞书 Webhook',
  }[type];
}

export function rendererLabel(renderer: MessageRenderer) {
  return {
    text: '文本',
    template: '通用模板',
    template_card: '模板卡片',
    markdown: 'Markdown',
    card: '卡片',
  }[renderer] || renderer;
}

export function deliveryBadgeClass(type: DeliveryType) {
  return {
    wechat: 'channel-tone-wechat',
    work_wechat: 'channel-tone-work-wechat',
    dingtalk: 'channel-tone-dingtalk',
    feishu: 'badge-neutral',
  }[type];
}

export function rendererBadgeClass(renderer: MessageRenderer) {
  return {
    text: 'badge-neutral',
    template: 'badge-cyan',
    template_card: 'badge-amber',
    markdown: 'badge-emerald',
    card: 'badge-rose',
  }[renderer] || 'badge-neutral';
}

export function messageProfileLabel(deliveryType: DeliveryType, messageProfile: AppMessageProfile) {
  if (deliveryType === 'wechat' || deliveryType === 'work_wechat') {
    return messageProfile.defaultSendType === 'page' ? '网页' : '文本';
  }

  return rendererLabel(messageProfile.renderer);
}

export function messageProfileBadgeClass(deliveryType: DeliveryType, messageProfile: AppMessageProfile) {
  if (deliveryType === 'wechat' || deliveryType === 'work_wechat') {
    return messageProfile.defaultSendType === 'page' ? 'badge-cyan' : 'badge-neutral';
  }

  return rendererBadgeClass(messageProfile.renderer);
}

export function recipientModeLabel(mode: ManagedAppLiteDetail['recipientProfile']['mode']) {
  return {
    subscribe: '订阅绑定',
    single: '单接收者',
    fixed_targets: '固定目标',
    none: '无需接收者',
  }[mode];
}

export function recipientBadgeClass(mode: ManagedAppLiteDetail['recipientProfile']['mode']) {
  return {
    subscribe: 'badge-cyan',
    single: 'badge-emerald',
    fixed_targets: 'badge-amber',
    none: 'badge-neutral',
  }[mode];
}

export function maintenanceBadgeClass(maintenance: AuthProfileDetail['maintenance']) {
  return {
    healthy: 'badge-emerald',
    warning: 'badge-amber',
    error: 'badge-rose',
    unknown: 'badge-neutral',
  }[maintenance.status];
}

export function maintenanceLabel(maintenance: AuthProfileDetail['maintenance']) {
  return {
    healthy: '正常',
    warning: '待关注',
    error: '异常',
    unknown: '未验证',
  }[maintenance.status];
}

export function formatCompactDateTime(value?: string | number) {
  if (!value) return '未记录';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function recipientsHelp(app: ManagedAppLiteDetail) {
  if (app.deliveryType === 'wechat') return '公众号应用通过绑定二维码或绑定指令完成接收者订阅。';
  if (app.deliveryType === 'work_wechat') return '企业微信应用使用固定 userIds / departmentIds。';
  return 'Webhook 应用无需单独绑定接收者。';
}
