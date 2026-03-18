import type {
  AuthProfileDetail,
  DeliveryType,
  JumpBehavior,
  ManagedAppLiteDetail,
  MessageRenderer,
  PushContentFormat,
  SimplifiedSendType,
  TemplateFieldSource,
  TemplateProfile,
  TemplateSummaryMode,
} from '~/types';

export type SheetMode = '' | 'create' | 'edit';

export interface FieldMapItem {
  id: string;
  key: string;
  source: TemplateFieldSource;
  value: string;
}

export interface TemplateProfileFormItem {
  id: string;
  key: string;
  name: string;
  templateId: string;
  jumpBehavior: JumpBehavior;
  summaryMode: TemplateSummaryMode;
  enabled: boolean;
  isDefault: boolean;
  fieldMap: FieldMapItem[];
}

export interface AppsCapabilityMap extends Record<string, {
  renderers?: MessageRenderer[];
  sendTypes?: SimplifiedSendType[];
  contentFormats?: PushContentFormat[];
  jumpBehaviors?: JumpBehavior[];
  supportsTemplateProfiles?: boolean;
}> {}

export interface ManagedAppFormState {
  name: string;
  deliveryType: DeliveryType;
  webhookUrl: string;
  webhookSecret: string;
  authMode: 'existing' | 'draft';
  authProfileId: string;
  draft: {
    name: string;
    wechat: {
      appId: string;
      appSecret: string;
    };
    workWechat: {
      corpId: string;
      agentId: number;
      corpSecret: string;
    };
  };
  renderer: MessageRenderer;
  defaultSendType: SimplifiedSendType;
  contentFormatDefault: PushContentFormat;
  jumpBehavior: JumpBehavior;
  templateId: string;
  fallbackToText: boolean;
  fieldMap: FieldMapItem[];
  templateProfiles: TemplateProfileFormItem[];
  userIdsText: string;
  departmentIdsText: string;
}

export interface BindStateShape {
  loading: boolean;
  code: string;
  status: 'pending' | 'bound' | 'expired';
  expiresAt?: number;
  qrCodeUrl?: string;
  openId?: string;
  nickname?: string;
  avatar?: string;
}

export interface ManagedAppsWorkspaceState {
  selectedApp: ManagedAppLiteDetail | null;
  selectedAuthProfileDetail: AuthProfileDetail | null;
}

export type TemplateProfileInput = Partial<TemplateProfile>;
