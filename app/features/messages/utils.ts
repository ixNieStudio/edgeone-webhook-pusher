import type {
  Message,
  MessageDeliveryState,
  MessageDetailView,
  MessageListItem,
} from '~/types';

export function messageTypeLabel(type: Message['type']) {
  return {
    push: '推送',
    text: '文本',
    event: '事件',
  }[type];
}

export function messageDirectionLabel(direction: Message['direction']) {
  return direction === 'outbound' ? '发出' : '收到';
}

export function messageDirectionBadge(direction: Message['direction']) {
  return direction === 'outbound' ? 'badge-cyan' : 'badge-neutral';
}

export function messageStateLabel(state: MessageDeliveryState) {
  return {
    received: '收到',
    success: '成功',
    partial: '部分失败',
    failed: '失败',
  }[state];
}

export function messageStateBadge(state: MessageDeliveryState) {
  return {
    received: 'badge-neutral',
    success: 'badge-emerald',
    partial: 'badge-amber',
    failed: 'badge-rose',
  }[state];
}

export function messageCardClass(item: Pick<MessageListItem, 'direction' | 'delivery'>, active: boolean) {
  if (active) {
    return 'border-[color:color-mix(in_srgb,var(--color-accent)_26%,transparent)] bg-[var(--color-accent-soft)]/82 shadow-[var(--shadow-panel-soft)]';
  }

  if (item.direction === 'inbound') {
    return 'border-[var(--app-border)] bg-[var(--color-panel-inset)]/86 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-panel-strong)]';
  }

  return {
    success: 'border-[color:color-mix(in_srgb,var(--color-success)_28%,transparent)] bg-[var(--color-success-soft)]/34 hover:border-[color:color-mix(in_srgb,var(--color-success)_38%,transparent)]',
    partial: 'border-[color:color-mix(in_srgb,var(--color-warning)_30%,transparent)] bg-[var(--color-warning-soft)]/34 hover:border-[color:color-mix(in_srgb,var(--color-warning)_38%,transparent)]',
    failed: 'border-[color:color-mix(in_srgb,var(--color-danger)_32%,transparent)] bg-[var(--color-danger-soft)]/30 hover:border-[color:color-mix(in_srgb,var(--color-danger)_42%,transparent)]',
    received: 'border-[var(--app-border)] bg-[var(--color-panel-inset)]/86 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-panel-strong)]',
  }[item.delivery.state];
}

export function formatMessageDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  }
  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  }
  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  }
  return `${Math.max(1, Math.floor(diff / day))} 天前`;
}

export function formatOpenId(openId?: string) {
  if (!openId) {
    return '-';
  }
  if (openId.length <= 14) {
    return openId;
  }
  return `${openId.slice(0, 6)}...${openId.slice(-4)}`;
}

export function messageSourceLabel(item: MessageListItem | MessageDetailView) {
  if (item.direction === 'outbound') {
    return item.appName || item.appId || '未命名应用';
  }

  if (item.type === 'event' && item.event) {
    return `微信事件 · ${item.event}`;
  }

  return `OpenID · ${formatOpenId(item.openId)}`;
}

export function messageSnippet(item: MessageListItem | MessageDetailView) {
  return item.previewText || item.title;
}

export function messageFormatLabel(item: Pick<Message, 'contentFormat'> & { detailPageUrl?: string; jumpMode?: Message['jumpMode'] }) {
  if (item.detailPageUrl || item.jumpMode === 'landing') {
    return '网页';
  }

  return {
    text: '文本',
    markdown: '网页',
    html: '网页',
    undefined: '文本',
  }[String(item.contentFormat) as 'text' | 'markdown' | 'html' | 'undefined'];
}
