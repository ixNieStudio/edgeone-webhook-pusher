/**
 * App 应用相关类型定义
 */

export type PushMode = 'single' | 'subscribe';
export type MessageType = 'normal' | 'template';

export interface App {
  id: string;
  key: string;
  name: string;
  channelId: string;
  pushMode: PushMode;
  messageType: MessageType;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  
  // 体验模式字段
  isDemoApp?: boolean;      // 是否为体验应用
  demoCreatedAt?: string;   // 体验应用创建时间（用于计算过期）
}

export interface CreateAppInput {
  name: string;
  channelId: string;
  pushMode: PushMode;
  messageType?: MessageType;
  templateId?: string;
}

export interface UpdateAppInput {
  name?: string;
  templateId?: string;
}
