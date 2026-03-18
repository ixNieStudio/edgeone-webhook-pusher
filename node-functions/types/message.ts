/**
 * Message 消息相关类型定义
 */

import type { PushContentFormat, SimplifiedSendType } from './app-config.js';

/**
 * 消息方向
 * - outbound: 发出的消息（推送给用户）
 * - inbound: 收到的消息（用户发来的）
 */
export type MessageDirection = 'outbound' | 'inbound';

/**
 * 消息记录类型
 * - push: 推送消息
 * - text: 文本消息
 * - event: 事件消息（关注、取消关注、扫码等）
 */
export type MessageRecordType = 'push' | 'text' | 'event';

export interface DeliveryResult {
  openId: string;
  success: boolean;
  error?: string;
  msgId?: string;
}

export type MessageDeliveryState = 'received' | 'success' | 'partial' | 'failed';

export interface MessageDeliverySummary {
  total: number;
  success: number;
  failed: number;
  state: MessageDeliveryState;
}

export interface Message {
  id: string;
  direction: MessageDirection;  // 消息方向
  type: MessageRecordType;      // 消息类型
  channelId: string;            // 渠道 ID
  appId?: string;               // 应用 ID（推送消息必有）
  appName?: string;             // 应用名称（API 返回时填充）
  openId?: string;              // 用户 OpenID（收到的消息必有）
  userNickname?: string;        // 用户昵称（API 返回时填充）
  userAvatar?: string;          // 用户头像（API 返回时填充）
  title: string;                // 标题/摘要
  desp?: string;                // 详细内容
  summary?: string;             // 展示摘要
  content?: string;             // 富文本正文
  contentFormat?: PushContentFormat;
  originalUrl?: string;
  detailPageToken?: string;
  detailPageUrl?: string;
  jumpMode?: 'direct' | 'landing' | 'none';
  templateProfileKey?: string;
  event?: string;               // 事件类型（subscribe/unsubscribe/SCAN 等）
  results?: DeliveryResult[];   // 发送结果（仅发出的消息）
  createdAt: string;
}

export interface MessageFilterAppItem {
  id: string;
  name: string;
}

export interface MessageListItem {
  id: string;
  direction: MessageDirection;
  type: MessageRecordType;
  channelId: string;
  appId?: string;
  appName?: string;
  openId?: string;
  title: string;
  previewText: string;
  contentFormat?: PushContentFormat;
  originalUrl?: string;
  detailPageUrl?: string;
  jumpMode?: 'direct' | 'landing' | 'none';
  event?: string;
  createdAt: string;
  delivery: MessageDeliverySummary;
}

export interface MessageListStats {
  total: number;
  recent24h: number;
  success: number;
  failed: number;
}

export interface MessageWorkspaceResponse {
  items: MessageListItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats: MessageListStats;
  filters: {
    apps: MessageFilterAppItem[];
  };
}

export interface MessageDetailView extends Message {
  delivery: MessageDeliverySummary;
  previewText: string;
}

export interface PushMessageInput {
  title: string;
  desp?: string;
  content?: string;
  type?: SimplifiedSendType;
  format?: PushContentFormat;
  url?: string;
  summary?: string;
  short?: string;
  template?: string;
}

export interface PushResult {
  pushId: string;
  total: number;
  success: number;
  failed: number;
  results?: DeliveryResult[];
}

export interface NormalizedMessage {
  title: string;
  summary: string;
  body: string;
  type?: SimplifiedSendType;
  contentFormat: PushContentFormat;
  originalUrl?: string;
  detailPageUrl?: string;
  detailPageToken?: string;
  jumpMode: 'direct' | 'landing' | 'none';
  templateProfileKey?: string;
}

export interface MessageDetailSnapshot {
  token: string;
  messageId: string;
  appId?: string;
  appKey?: string;
  appName?: string;
  title: string;
  summary: string;
  body: string;
  contentFormat: PushContentFormat;
  originalUrl?: string;
  createdAt: string;
}

export interface PublicMessageDetail {
  token: string;
  title: string;
  summary: string;
  body: string;
  contentFormat: PushContentFormat;
  renderedHtml: string;
  originalUrl?: string;
  appName?: string;
  createdAt: string;
}
