/**
 * App delivery configuration storage and resolution.
 */

import type { App } from '../types/app.js';
import type { Channel } from '../types/channel.js';
import {
  type AppDeliveryConfig,
  type AppResolvedConfig,
  type AppMessageProfile,
  type AppRecipientProfile,
  type ResolvedAppContext,
  type SimplifiedSendType,
  type TemplateProfile,
  LegacyMessageTypeMap,
} from '../types/app-config.js';
import { appsKV, channelsKV } from '../shared/kv-client.js';
import { KVKeys } from '../types/constants.js';
import { now } from '../shared/utils.js';
import { channelService } from './channel.service.js';
import { ApiError } from '../types/api.js';
import { isWeChatApp, isWorkWeChatApp, isWebhookApp } from '../shared/type-guards.js';

function createLegacyFieldMap(): Record<string, { source: 'title' | 'desp' | 'static'; value?: string }> {
  return {
    first: { source: 'title' },
    keyword1: { source: 'desp' },
    remark: { source: 'static', value: '' },
  };
}

function createLegacyTemplateProfiles(app: App): TemplateProfile[] | undefined {
  if (app.channelType !== 'wechat' || !app.templateId) {
    return undefined;
  }

  return [
    {
      key: 'default',
      name: '默认模板',
      templateId: app.templateId,
      fieldMap: createLegacyFieldMap(),
      jumpBehavior: 'direct_first',
      summaryMode: 'auto',
      enabled: true,
      isDefault: true,
    },
  ];
}

function inferDefaultSendType(
  deliveryType: App['channelType'],
  messageProfile: Partial<AppMessageProfile> | undefined,
  app?: App
): SimplifiedSendType | undefined {
  if (deliveryType !== 'wechat' && deliveryType !== 'work_wechat') {
    return undefined;
  }

  if (messageProfile?.defaultSendType === 'text' || messageProfile?.defaultSendType === 'page') {
    return messageProfile.defaultSendType;
  }

  const hasLegacyRichTraits = Boolean(
    messageProfile?.templateId
      || messageProfile?.templateProfiles?.length
      || messageProfile?.renderer === 'template'
      || messageProfile?.renderer === 'template_card'
      || (messageProfile?.contentFormatDefault && messageProfile.contentFormatDefault !== 'text')
      || messageProfile?.jumpBehavior === 'landing_only'
      || (deliveryType === 'wechat' && app?.channelType === 'wechat' && app.messageType === 'template')
      || (deliveryType === 'work_wechat' && app?.channelType === 'work_wechat' && app.messageType === 'template_card')
  );

  return hasLegacyRichTraits ? 'page' : 'text';
}

function buildLegacyMessageProfile(app: App): AppMessageProfile {
  switch (app.channelType) {
    case 'wechat':
      return {
        renderer: LegacyMessageTypeMap[app.messageType],
        defaultSendType: app.messageType === LegacyMessageTypeMap.template ? 'page' : 'text',
        contentFormatDefault: 'text',
        jumpBehavior: 'direct_first',
        templateId: app.templateId,
        fieldMap: createLegacyFieldMap(),
        templateProfiles: createLegacyTemplateProfiles(app),
        fallbackToText: true,
      };
    case 'work_wechat':
      return {
        renderer: app.messageType === 'template_card' ? 'template_card' : 'text',
        defaultSendType: app.messageType === 'template_card' ? 'page' : 'text',
      };
    case 'dingtalk':
      return {
        renderer: 'text',
        atMobiles: app.atMobiles,
        atAll: app.atAll,
      };
    case 'feishu':
      return {
        renderer: 'text',
      };
  }
}

function buildLegacyRecipientProfile(app: App): AppRecipientProfile {
  switch (app.channelType) {
    case 'wechat':
      return {
        mode: app.pushMode ?? 'single',
        pushMode: app.pushMode,
      };
    case 'work_wechat':
      return {
        mode: 'fixed_targets',
        userIds: app.userIds ?? [],
        departmentIds: app.departmentIds ?? [],
      };
    default:
      return {
        mode: 'none',
      };
  }
}

class AppConfigService {
  private async refreshSendProfile(appId: string): Promise<void> {
    try {
      const { sendProfileService } = await import('./send-profile.service.js');
      await sendProfileService.syncByAppId(appId);
    } catch {
      // send profile 可在发送时自愈，这里避免阻断配置写入
    }
  }

  private async removeSendProfile(appId: string): Promise<void> {
    try {
      const { sendProfileService } = await import('./send-profile.service.js');
      await sendProfileService.removeByAppId(appId);
    } catch {
      // best effort
    }
  }

  async getByAppId(appId: string): Promise<AppDeliveryConfig | null> {
    return appsKV.get<AppDeliveryConfig>(KVKeys.APP_CONFIG(appId));
  }

  async save(config: AppDeliveryConfig): Promise<void> {
    await appsKV.put(KVKeys.APP_CONFIG(config.appId), config);
    await this.removeSendProfile(config.appId);
    await this.refreshSendProfile(config.appId);
  }

  async deleteByAppId(appId: string): Promise<void> {
    await appsKV.delete(KVKeys.APP_CONFIG(appId));
    await this.removeSendProfile(appId);
  }

  async resolveApp(app: App): Promise<ResolvedAppContext> {
    const storedConfigPromise = this.getByAppId(app.id);
    const defaultAuthProfilePromise = app.channelType === 'wechat' || app.channelType === 'work_wechat'
      ? channelService.getById(app.channelId)
      : Promise.resolve<Channel | null>(null);
    const inlineWebhookPromise = app.channelType === 'dingtalk' || app.channelType === 'feishu'
      ? this.resolveLegacyInlineWebhook(app)
      : Promise.resolve(null);

    const storedConfig = await storedConfigPromise;
    const authProfile = storedConfig?.authProfileId
      ? storedConfig.authProfileId === app.channelId
        ? await defaultAuthProfilePromise
        : await channelService.getById(storedConfig.authProfileId)
      : await defaultAuthProfilePromise;

    const inlineWebhookFromLegacy = !storedConfig
      ? await inlineWebhookPromise
      : null;

    const deliveryConfig = storedConfig ?? {
      appId: app.id,
      deliveryType: app.channelType,
      connectionMode: app.channelType === 'wechat' || app.channelType === 'work_wechat'
        ? 'auth_profile_ref'
        : 'inline_webhook',
      authProfileId: authProfile?.id,
      inlineWebhook: inlineWebhookFromLegacy ?? undefined,
      mcpPublished: false,
      mcpDescription: undefined,
      mcpTags: [],
      messageProfile: buildLegacyMessageProfile(app),
      recipientProfile: buildLegacyRecipientProfile(app),
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
    const defaultSendType = inferDefaultSendType(deliveryConfig.deliveryType, deliveryConfig.messageProfile, app);

    const normalizedDeliveryConfig = {
      ...deliveryConfig,
      mcpPublished: deliveryConfig.mcpPublished === true,
      mcpDescription: deliveryConfig.mcpDescription?.trim() || undefined,
      mcpTags: Array.from(
        new Set(
          (deliveryConfig.mcpTags ?? [])
            .map((tag) => tag.trim())
            .filter(Boolean)
        )
      ),
      messageProfile: {
        ...deliveryConfig.messageProfile,
        ...(defaultSendType ? { defaultSendType } : {}),
      },
    };

    const runtimeChannel = this.buildRuntimeChannel(app, normalizedDeliveryConfig, authProfile, inlineWebhookFromLegacy);
    const resolved: AppResolvedConfig = {
      appId: app.id,
      appKey: app.key,
      appName: app.name,
      deliveryType: normalizedDeliveryConfig.deliveryType,
      runtimeChannelId: runtimeChannel.id,
      authProfileId: normalizedDeliveryConfig.authProfileId ?? authProfile?.id,
      renderer: normalizedDeliveryConfig.messageProfile.renderer,
      defaultSendType,
      contentFormatDefault: normalizedDeliveryConfig.messageProfile.contentFormatDefault ?? 'text',
      jumpBehavior: normalizedDeliveryConfig.messageProfile.jumpBehavior ?? 'direct_first',
      templateId: normalizedDeliveryConfig.messageProfile.templateId ?? (isWeChatApp(app) ? app.templateId : undefined),
      fieldMap: normalizedDeliveryConfig.messageProfile.fieldMap,
      templateProfiles: normalizedDeliveryConfig.messageProfile.templateProfiles,
      fallbackToText: normalizedDeliveryConfig.messageProfile.fallbackToText,
      pushMode: normalizedDeliveryConfig.recipientProfile.pushMode ?? (isWeChatApp(app) ? app.pushMode : undefined),
      userIds: normalizedDeliveryConfig.recipientProfile.userIds ?? (isWorkWeChatApp(app) ? app.userIds : undefined),
      departmentIds: normalizedDeliveryConfig.recipientProfile.departmentIds ?? (isWorkWeChatApp(app) ? app.departmentIds : undefined),
      atMobiles: normalizedDeliveryConfig.messageProfile.atMobiles ?? (isWebhookApp(app) ? app.atMobiles : undefined),
      atAll: normalizedDeliveryConfig.messageProfile.atAll ?? (isWebhookApp(app) ? app.atAll : undefined),
    };

    return {
      deliveryConfig: normalizedDeliveryConfig,
      resolved,
      runtimeChannel,
      authProfile: authProfile ?? undefined,
      legacy: {
        usesLegacyChannel: !storedConfig && (app.channelType === 'wechat' || app.channelType === 'work_wechat'),
        usesInlineWebhookFallback: !storedConfig && !!inlineWebhookFromLegacy,
      },
    };
  }

  private async resolveLegacyInlineWebhook(app: App) {
    if (!app.channelId) {
      return null;
    }

    const legacyChannel = await channelsKV.get<any>(KVKeys.CHANNEL(app.channelId));
    if (!legacyChannel?.config?.webhookUrl) {
      return null;
    }

    return {
      webhookUrl: legacyChannel.config.webhookUrl,
      secret: legacyChannel.config.secret,
      atMobiles: app.channelType === 'dingtalk' ? app.atMobiles : undefined,
      atAll: app.channelType === 'dingtalk' ? app.atAll : undefined,
    };
  }

  private buildRuntimeChannel(
    app: App,
    config: AppDeliveryConfig,
    authProfile: Channel | null,
    legacyInlineWebhook: AppDeliveryConfig['inlineWebhook'] | null
  ): Channel {
    if (authProfile) {
      return authProfile;
    }

    const inlineWebhook = config.inlineWebhook ?? legacyInlineWebhook;
    if (!inlineWebhook) {
      throw ApiError.badRequest(`No runtime channel configuration found for app ${app.id}`);
    }

    return {
      id: `inline:${app.id}`,
      name: `${app.name} Inline Webhook`,
      type: config.deliveryType,
      config: {
        webhookUrl: inlineWebhook.webhookUrl,
        secret: inlineWebhook.secret,
        atMobiles: inlineWebhook.atMobiles,
        atAll: inlineWebhook.atAll,
      } as Channel['config'],
      createdAt: app.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  mergeConfig(
    appId: string,
    current: AppDeliveryConfig | null,
    updates: Partial<Omit<AppDeliveryConfig, 'messageProfile' | 'recipientProfile'>> & {
      messageProfile?: Partial<AppMessageProfile>;
      recipientProfile?: Partial<AppRecipientProfile>;
    }
  ): AppDeliveryConfig {
    const timestamp = now();

    if (!current) {
      throw ApiError.badRequest(`App config for ${appId} does not exist`);
    }

    return {
      ...current,
      ...updates,
      messageProfile: {
        ...current.messageProfile,
        ...updates.messageProfile,
      },
      recipientProfile: {
        ...current.recipientProfile,
        ...updates.recipientProfile,
      },
      inlineWebhook: updates.inlineWebhook === undefined
        ? current.inlineWebhook
        : updates.inlineWebhook,
      updatedAt: timestamp,
    };
  }
}

export const appConfigService = new AppConfigService();
