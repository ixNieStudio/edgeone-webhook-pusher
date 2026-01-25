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
}

// 微信应用配置
export interface WeChatAppConfig extends BaseApp {
  channelType: 'wechat';
  pushMode: PushMode;
  messageType: MessageType;
  templateId?: string;
}

// 企业微信应用配置
export interface WorkWeChatAppConfig extends BaseApp {
  channelType: 'work_wechat';
  userIds?: string[];      // 目标用户ID列表
  departmentIds?: string[]; // 目标部门ID列表
  messageType: 'text' | 'template_card'; // 消息类型
}

// Webhook 应用配置
export interface WebhookAppConfig extends BaseApp {
  channelType: 'dingtalk' | 'feishu';
  webhookUrl: string;      // Webhook URL（从渠道继承或覆盖）
  atMobiles?: string[];    // @的手机号列表（钉钉）
  atAll?: boolean;         // 是否@所有人
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
