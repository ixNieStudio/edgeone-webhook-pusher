/**
 * Demo App Types - 体验应用类型定义（前端）
 */

import type { PushMode, MessageType } from './app';

/**
 * 体验应用配置
 */
export interface DemoApp {
  id: string;
  key: string;
  name: string;
  channelId: string;
  pushMode: PushMode;
  messageType: MessageType;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  
  // 体验应用特有字段
  expiresAt: string;  // 过期时间 (ISO 8601)
  expiryDays: number; // 有效天数 (默认3天)
}

/**
 * 创建体验应用的输入参数
 */
export interface CreateDemoAppInput {
  name: string;
  pushMode: PushMode;
  messageType?: MessageType;
}
