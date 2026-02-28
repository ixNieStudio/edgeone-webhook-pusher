/**
 * Demo App Types - 体验应用类型定义
 * Feature: demo-mode
 * 
 * 体验应用使用独立的类型系统,不污染生产应用类型
 */

import type { PushMode, MessageType } from './app.js';

/**
 * 体验应用配置
 * 
 * 设计原则:
 * - 使用独立的 KV key 前缀 (demo_app:{id})
 * - 不与生产应用混合存储
 * - 包含过期时间用于自动清理
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
