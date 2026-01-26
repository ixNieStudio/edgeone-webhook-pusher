/**
 * App 应用相关类型定义
 */

export type PushMode = 'single' | 'subscribe';
export type MessageType = 'normal' | 'template';

// 基础应用配置
export interface BaseApp {
  id: string;
  key: string;
  name: string;
  channelId: string;
  createdAt: string;
  updatedAt: string;
  
  // 体验模式字段
  isDemoApp?: boolean;      // 是否为体验应用
  demoCreatedAt?: string;   // 体验应用创建时间（用于计算过期）
  
  // 兼容性字段（用于前端组件，根据 channelType 判断是否存在）
  // 这些字段在不同的 App 类型中可能存在或不存在
  pushMode?: PushMode;           // 微信专用
  messageType?: MessageType | 'text' | 'template_card';  // 微信和企业微信
  templateId?: string;           // 微信专用
  userIds?: string[];            // 企业微信专用
  departmentIds?: string[];      // 企业微信专用
  webhookUrl?: string;           // Webhook 专用
  atMobiles?: string[];          // 钉钉专用
  atAll?: boolean;               // 钉钉专用
}

// 微信应用配置
export interface WeChatAppConfig extends BaseApp {
  channelType: 'wechat';
  pushMode: PushMode;              // 必需（覆盖 BaseApp 的可选定义）
  messageType: MessageType;        // 必需（覆盖 BaseApp 的可选定义）
  templateId?: string;
}

// 企业微信应用配置
export interface WorkWeChatAppConfig extends BaseApp {
  channelType: 'work_wechat';
  userIds?: string[];
  departmentIds?: string[];
  messageType: 'text' | 'template_card';  // 必需（覆盖 BaseApp 的可选定义）
}

// Webhook 应用配置
export interface WebhookAppConfig extends BaseApp {
  channelType: 'dingtalk' | 'feishu';
  webhookUrl: string;              // 必需（覆盖 BaseApp 的可选定义）
  atMobiles?: string[];
  atAll?: boolean;
}

// 联合类型：所有应用配置
export type App = WeChatAppConfig | WorkWeChatAppConfig | WebhookAppConfig;

export interface CreateAppInput {
  name: string;
  channelId: string;
  pushMode?: PushMode;
  messageType?: MessageType;
  templateId?: string;
  userIds?: string[];
  departmentIds?: string[];
  webhookUrl?: string;
  atMobiles?: string[];
  atAll?: boolean;
}

export interface UpdateAppInput {
  name?: string;
  templateId?: string;
  userIds?: string[];
  departmentIds?: string[];
  webhookUrl?: string;
  atMobiles?: string[];
  atAll?: boolean;
}
