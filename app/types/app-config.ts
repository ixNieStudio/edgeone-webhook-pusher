/**
 * App-first admin configuration types.
 */

import type { ChannelType } from './channel';
import type { MessageType, PushMode } from './app';

export type DeliveryType = ChannelType;
export type ConnectionMode = 'inline_webhook' | 'auth_profile_ref';
export type MessageRenderer = 'text' | 'template' | 'template_card' | 'markdown' | 'card';
export type RecipientMode = 'single' | 'subscribe' | 'fixed_targets' | 'none';
export type PushContentFormat = 'text' | 'markdown' | 'html';
export type SimplifiedSendType = 'text' | 'page';
export type JumpBehavior = 'direct_first' | 'landing_only' | 'none';
export type TemplateSummaryMode = 'auto' | 'title_only' | 'summary_first';
export type TemplateFieldSource =
  | 'title'
  | 'desp'
  | 'content'
  | 'summary'
  | 'url'
  | 'detail_page_url'
  | 'static'
  | 'timestamp';

export interface TemplateFieldMapping {
  source: TemplateFieldSource;
  value?: string;
}

export interface TemplateProfile {
  key: string;
  name: string;
  templateId: string;
  fieldMap?: Record<string, TemplateFieldMapping>;
  jumpBehavior?: JumpBehavior;
  summaryMode?: TemplateSummaryMode;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface AppMessageProfile {
  renderer: MessageRenderer;
  defaultSendType?: SimplifiedSendType;
  contentFormatDefault?: PushContentFormat;
  jumpBehavior?: JumpBehavior;
  templateId?: string;
  fieldMap?: Record<string, TemplateFieldMapping>;
  templateProfiles?: TemplateProfile[];
  fallbackToText?: boolean;
  atMobiles?: string[];
  atAll?: boolean;
}

export interface AppRecipientProfile {
  mode: RecipientMode;
  pushMode?: PushMode;
  userIds?: string[];
  departmentIds?: string[];
}

export interface InlineWebhookConnection {
  webhookUrl: string;
  secret?: string;
  atMobiles?: string[];
  atAll?: boolean;
}

export interface AppMcpConfigInput {
  published?: boolean;
  description?: string;
  tags?: string[];
}

export interface AppDeliveryConfig {
  appId: string;
  deliveryType: DeliveryType;
  connectionMode: ConnectionMode;
  authProfileId?: string;
  inlineWebhook?: InlineWebhookConnection;
  mcpPublished?: boolean;
  mcpDescription?: string;
  mcpTags?: string[];
  messageProfile: AppMessageProfile;
  recipientProfile: AppRecipientProfile;
  createdAt: string;
  updatedAt: string;
}

export interface AuthProfileSummary {
  id: string;
  name: string;
  type: Extract<DeliveryType, 'wechat' | 'work_wechat'>;
  config: Record<string, unknown>;
  maintenanceSnapshot: AuthProfileMaintenanceStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthProfileConfigDisplayItem {
  key: string;
  label: string;
  value: string;
  masked?: boolean;
  copyable?: boolean;
}

export interface AuthProfileMaintenanceStatus {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  valid: boolean;
  lastRefreshAt?: number;
  lastRefreshSuccess: boolean;
  expiresAt?: number;
  error?: string;
  errorCode?: number;
  supportsVerification: boolean;
}

export interface AuthProfileUsageItem {
  appId: string;
  appKey: string;
  appName: string;
  deliveryType: Extract<DeliveryType, 'wechat' | 'work_wechat'>;
}

export interface WeChatInboundMaintenanceInfo {
  callbackUrl: string;
  baseUrlSource: 'env' | 'request';
  msgToken: string;
}

export interface AuthProfileDetail extends AuthProfileSummary {
  configDisplay: AuthProfileConfigDisplayItem[];
  maintenance: AuthProfileMaintenanceStatus;
  usage: AuthProfileUsageItem[];
  wechatInbound?: WeChatInboundMaintenanceInfo;
}

export interface AppRecipientView {
  id: string;
  kind: 'openid' | 'work_wechat_user' | 'work_wechat_department';
  label: string;
  detail?: string;
  avatar?: string;
}

export interface ManagedAppConnectionDetail {
  mode: ConnectionMode;
  status: 'configured' | 'missing';
  maskedWebhookUrl?: string;
  secretConfigured?: boolean;
}

export interface ManagedAppSummary {
  id: string;
  key: string;
  name: string;
  deliveryType: DeliveryType;
  connectionMode: ConnectionMode;
  authProfileId?: string;
  authProfileName?: string;
  messageProfile: AppMessageProfile;
  recipientProfile: AppRecipientProfile;
  recipientCount: number;
  maintenanceSnapshot?: AuthProfileMaintenanceStatus;
  mcpPublished: boolean;
  mcpDescription?: string;
  mcpTags?: string[];
  sendUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedAppLiteDetail extends ManagedAppSummary {
  authProfile?: AuthProfileSummary;
  connectionDetail: ManagedAppConnectionDetail;
  legacy: {
    usesLegacyChannel: boolean;
    usesInlineWebhookFallback: boolean;
  };
}

export interface ManagedAppDetail extends ManagedAppLiteDetail {
  recipients: AppRecipientView[];
}

export interface CreateManagedAppInput {
  name: string;
  deliveryType: DeliveryType;
  connection:
    | {
        mode: 'inline_webhook';
        webhookUrl: string;
        secret?: string;
        atMobiles?: string[];
        atAll?: boolean;
      }
    | {
        mode: 'auth_profile_ref';
        authProfileId: string;
      }
    | {
        mode: 'auth_profile_draft';
        authProfile: {
          name: string;
          type: Extract<DeliveryType, 'wechat' | 'work_wechat'>;
          config: Record<string, unknown>;
        };
      };
  messageProfile: {
    renderer: MessageRenderer;
    defaultSendType?: SimplifiedSendType;
    contentFormatDefault?: PushContentFormat;
    jumpBehavior?: JumpBehavior;
    templateId?: string;
    fieldMap?: Record<string, TemplateFieldMapping>;
    templateProfiles?: TemplateProfile[];
    fallbackToText?: boolean;
    atMobiles?: string[];
    atAll?: boolean;
  };
  recipientProfile?: {
    mode?: RecipientMode;
    pushMode?: PushMode;
    userIds?: string[];
    departmentIds?: string[];
  };
  mcp?: AppMcpConfigInput;
}

export interface UpdateManagedAppInput {
  name?: string;
  connection?:
    | {
        mode: 'inline_webhook';
        webhookUrl: string;
        secret?: string;
        atMobiles?: string[];
        atAll?: boolean;
      }
    | {
        mode: 'auth_profile_ref';
        authProfileId: string;
      };
  messageProfile?: Partial<AppMessageProfile>;
  recipientProfile?: Partial<AppRecipientProfile>;
  mcp?: AppMcpConfigInput;
}

export interface SetupOverview {
  initialized: boolean;
  stats: {
    apps: number;
    authProfiles: number;
    messages: number;
    recipients: number;
  };
  onboarding: Array<{
    key: string;
    title: string;
      completed: boolean;
      description: string;
  }>;
  indexes: {
    apps: IndexCollectionStatus;
    authProfiles: IndexCollectionStatus;
  };
}

export interface IndexCollectionStatus {
  version: number;
  total: number;
  summaryCount: number;
  healthy: boolean;
  updatedAt?: string;
  lastRepairAt?: string;
}

export interface AppSummaryIndexRecord {
  id: string;
  key: string;
  name: string;
  deliveryType: DeliveryType;
  connectionMode: ConnectionMode;
  authProfileId?: string;
  authProfileName?: string;
  messageProfile: AppMessageProfile;
  recipientProfile: AppRecipientProfile;
  recipientCount: number;
  maintenanceSnapshot?: AuthProfileMaintenanceStatus;
  mcpPublished?: boolean;
  mcpDescription?: string;
  mcpTags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppCollectionMeta {
  version: number;
  total: number;
  summaryCount: number;
  totalRecipients: number;
  countsByDeliveryType: Partial<Record<DeliveryType, number>>;
  updatedAt: string;
  lastRepairAt?: string;
}

export interface AuthProfileSummaryIndexRecord extends AuthProfileSummary {}

export interface AuthProfileCollectionMeta {
  version: number;
  total: number;
  summaryCount: number;
  countsByType: Partial<Record<Extract<DeliveryType, 'wechat' | 'work_wechat'>, number>>;
  updatedAt: string;
  lastRepairAt?: string;
}

export interface IndexRepairResponse {
  indexes: {
    apps: IndexCollectionStatus;
    authProfiles: IndexCollectionStatus;
  };
}

export const LegacyMessageTypeMap = {
  normal: 'text',
  template: 'template',
} as const satisfies Record<MessageType, MessageRenderer>;
