/**
 * Message 消息相关类型定义
 */

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
  event?: string;               // 事件类型（subscribe/unsubscribe/SCAN 等）
  results?: DeliveryResult[];   // 发送结果（仅发出的消息）
  createdAt: string;
}

export interface PushMessageInput {
  title: string;
  desp?: string;
}

export interface PushResult {
  pushId: string;
  total: number;
  success: number;
  failed: number;
  results?: DeliveryResult[];
}
