/**
 * App-first orchestration service.
 */

import { appsKV } from '../shared/kv-client.js';
import {
  type App,
  type WebhookAppConfig,
  type WeChatAppConfig,
  type WorkWeChatAppConfig,
  type PushMessageInput,
  type OpenID,
} from '../types/index.js';
import {
  type AppDeliveryConfig,
  type AppMessageProfile,
  type AppRecipientProfile,
  type AppRecipientView,
  type CreateManagedAppInput,
  type ManagedAppLiteDetail,
  type ManagedAppSummary,
  type SetupOverview,
  type TemplateProfile,
  type UpdateManagedAppInput,
} from '../types/app-config.js';
import { appService } from './app.service.js';
import { appConfigService } from './app-config.service.js';
import { authProfileService } from './auth-profile.service.js';
import { openidService } from './openid.service.js';
import { bindCodeService } from './bindcode.service.js';
import { messageService } from './message.service.js';
import { channelService } from './channel.service.js';
import { adminIndexService } from './admin-index.service.js';
import { generateAppId, generateAppKey, maskWebhookUrl, now } from '../shared/utils.js';
import { KVKeys, MessageTypes, PushModes } from '../types/constants.js';
import { ApiError } from '../types/api.js';

class AppOrchestratorService {
  async list(baseUrl: string): Promise<ManagedAppSummary[]> {
    return adminIndexService.listAppSummaries(baseUrl);
  }

  async get(id: string, baseUrl: string): Promise<ManagedAppLiteDetail> {
    return this.getLiteDetail(id, baseUrl);
  }

  async getLiteDetail(id: string, baseUrl: string): Promise<ManagedAppLiteDetail> {
    const app = await appService.getById(id);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    return this.toLiteDetailSafe(app, baseUrl);
  }

  async getConfig(id: string): Promise<AppDeliveryConfig> {
    const app = await appService.getById(id);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    return (await appConfigService.resolveApp(app)).deliveryConfig;
  }

  async create(input: CreateManagedAppInput): Promise<ManagedAppLiteDetail> {
    this.validateCreateInput(input);

    const authProfileId = await this.resolveAuthProfileId(input);
    const app = await this.createAppRecord(input, authProfileId);
    const deliveryConfig = this.buildDeliveryConfig(app, input, authProfileId);

    await appConfigService.save(deliveryConfig);
    await adminIndexService.syncApp(app);
    return this.get(app.id, '');
  }

  async update(id: string, input: UpdateManagedAppInput, baseUrl: string): Promise<ManagedAppLiteDetail> {
    const app = await appService.getById(id);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    const resolved = await appConfigService.resolveApp(app);
    const nextConnectionMode = input.connection?.mode === 'inline_webhook' ? 'inline_webhook' : resolved.deliveryConfig.connectionMode;
    const nextAuthProfileId = input.connection?.mode === 'auth_profile_ref'
      ? input.connection.authProfileId
      : resolved.deliveryConfig.authProfileId;

    if (input.connection?.mode === 'auth_profile_ref') {
      const authProfile = await authProfileService.getRawById(input.connection.authProfileId);
      if (!authProfile) {
        throw ApiError.badRequest('Auth profile not found');
      }

      if (authProfile.type !== app.channelType) {
        throw ApiError.badRequest('Auth profile type does not match app delivery type');
      }
    }

    const updatedApp = this.applyAppRecordUpdates(app, input, nextConnectionMode, nextAuthProfileId);
    const mergedConfig = appConfigService.mergeConfig(id, resolved.deliveryConfig, {
      connectionMode: nextConnectionMode,
      authProfileId: nextAuthProfileId,
      inlineWebhook: input.connection?.mode === 'inline_webhook'
        ? {
            webhookUrl: input.connection.webhookUrl,
            secret: input.connection.secret,
            atMobiles: input.connection.atMobiles,
            atAll: input.connection.atAll,
          }
        : resolved.deliveryConfig.inlineWebhook,
      mcpPublished: input.mcp?.published ?? resolved.deliveryConfig.mcpPublished,
      mcpDescription: input.mcp?.description ?? resolved.deliveryConfig.mcpDescription,
      mcpTags: input.mcp?.tags ?? resolved.deliveryConfig.mcpTags,
      messageProfile: input.messageProfile ? { ...input.messageProfile } : undefined,
      recipientProfile: input.recipientProfile ? { ...input.recipientProfile } : undefined,
      updatedAt: now(),
    });

    await appsKV.put(KVKeys.APP(id), updatedApp);
    await appConfigService.save(mergedConfig);
    await adminIndexService.syncApp(updatedApp, {
      previousAuthProfileId: resolved.deliveryConfig.authProfileId,
    });

    return this.get(id, baseUrl);
  }

  async delete(id: string): Promise<void> {
    const app = await appService.getById(id);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    const resolved = await appConfigService.resolveApp(app);
    await appService.delete(id);
    await appConfigService.deleteByAppId(id);
    await adminIndexService.removeApp(app, {
      authProfileId: resolved.deliveryConfig.authProfileId,
    });
  }

  async listRecipients(appId: string): Promise<AppRecipientView[]> {
    const app = await appService.getById(appId);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    const resolved = await appConfigService.resolveApp(app);
    if (resolved.resolved.deliveryType === 'wechat') {
      const recipients = await openidService.listByApp(appId);
      return recipients.map((recipient) => this.mapOpenIdRecipient(recipient));
    }

    if (resolved.resolved.deliveryType === 'work_wechat') {
      const users = (resolved.resolved.userIds ?? []).map((userId) => ({
        id: `user:${userId}`,
        kind: 'work_wechat_user' as const,
        label: userId,
        detail: '企业微信用户',
      }));
      const departments = (resolved.resolved.departmentIds ?? []).map((departmentId) => ({
        id: `dept:${departmentId}`,
        kind: 'work_wechat_department' as const,
        label: departmentId,
        detail: '企业微信部门',
      }));
      return [...users, ...departments];
    }

    return [];
  }

  async createBind(appId: string): Promise<{ bindCode: string; expiresAt: number; qrCodeUrl?: string }> {
    const app = await appService.getById(appId);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    if (app.channelType !== 'wechat') {
      throw ApiError.badRequest('Only WeChat apps support binding');
    }

    const resolved = await appConfigService.resolveApp(app);
    const bindCode = await bindCodeService.create(
      {
        appId,
        channelId: resolved.runtimeChannel.id as string,
      },
      resolved.runtimeChannel as any
    );

    return {
      bindCode: bindCode.code,
      expiresAt: bindCode.expiresAt,
      qrCodeUrl: bindCode.qrCodeUrl,
    };
  }

  async getBindStatus(appId: string, code: string) {
    const app = await appService.getById(appId);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    if (app.channelType !== 'wechat') {
      throw ApiError.badRequest('Only WeChat apps support binding');
    }

    return bindCodeService.getStatus(code);
  }

  async deleteRecipient(appId: string, recipientId: string): Promise<void> {
    const app = await appService.getById(appId);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    if (app.channelType === 'wechat') {
      await openidService.delete(recipientId);
      return;
    }

    if (app.channelType === 'work_wechat') {
      const config = await this.getConfig(appId);
      const recipientProfile = {
        ...config.recipientProfile,
        userIds: [...(config.recipientProfile.userIds ?? [])],
        departmentIds: [...(config.recipientProfile.departmentIds ?? [])],
      };

      if (recipientId.startsWith('user:')) {
        recipientProfile.userIds = recipientProfile.userIds.filter((id) => id !== recipientId.slice(5));
      } else if (recipientId.startsWith('dept:')) {
        recipientProfile.departmentIds = recipientProfile.departmentIds.filter((id) => id !== recipientId.slice(5));
      } else {
        throw ApiError.badRequest('Invalid recipient id');
      }

      await this.update(appId, { recipientProfile }, '');
      return;
    }

    throw ApiError.badRequest('This app type has no removable recipients');
  }

  async testSend(appId: string, payload: PushMessageInput, baseUrl?: string) {
    const app = await appService.getById(appId);
    if (!app) {
      throw ApiError.notFound('App not found');
    }

    const { pushService } = await import('./push.service.js');
    return pushService.push(app.key, payload, { baseUrl });
  }

  async getSetupOverview(): Promise<SetupOverview> {
    const [indexStatus, messageTotal] = await Promise.all([
      adminIndexService.getIndexStatus(),
      messageService.getTotalCount(),
    ]);

    return {
      initialized: true,
      stats: {
        apps: indexStatus.apps.total,
        authProfiles: indexStatus.authProfiles.total,
        messages: messageTotal,
        recipients: await this.getTotalRecipientsFromIndex(),
      },
      onboarding: [
        {
          key: 'auth-profiles',
          title: '准备认证配置',
          completed: indexStatus.authProfiles.total > 0,
          description: '微信/企业微信应用需要认证配置，Webhook 应用可直接创建。',
        },
        {
          key: 'apps',
          title: '创建应用',
          completed: indexStatus.apps.total > 0,
          description: '先创建应用，再完成消息样式与发送测试。',
        },
        {
          key: 'messages',
          title: '发出第一条通知',
          completed: messageTotal > 0,
          description: '复制 send 地址后，直接发送 title/desp 即可验证链路。',
        },
      ],
      indexes: indexStatus,
    };
  }

  private async toSummary(app: App, baseUrl: string): Promise<ManagedAppSummary> {
    const resolved = await appConfigService.resolveApp(app);
    return this.buildSummaryFromResolved(app, resolved, baseUrl);
  }

  private async buildSummaryFromResolved(
    app: App,
    resolved: Awaited<ReturnType<typeof appConfigService.resolveApp>>,
    baseUrl: string
  ): Promise<ManagedAppSummary> {
    const recipientCount = await this.getRecipientCount(app, resolved);

    const maintenanceSnapshot = resolved.deliveryConfig.authProfileId
      ? (await adminIndexService.getAuthProfileSummary(resolved.deliveryConfig.authProfileId))?.maintenanceSnapshot
      : undefined;

    return {
      id: app.id,
      key: app.key,
      name: app.name,
      deliveryType: resolved.deliveryConfig.deliveryType,
      connectionMode: resolved.deliveryConfig.connectionMode,
      authProfileId: resolved.deliveryConfig.authProfileId,
      authProfileName: resolved.authProfile ? (resolved.authProfile as any).name : undefined,
      messageProfile: resolved.deliveryConfig.messageProfile,
      recipientProfile: resolved.deliveryConfig.recipientProfile,
      recipientCount,
      maintenanceSnapshot,
      mcpPublished: resolved.deliveryConfig.mcpPublished === true,
      mcpDescription: resolved.deliveryConfig.mcpDescription,
      mcpTags: resolved.deliveryConfig.mcpTags ?? [],
      sendUrl: `${baseUrl || ''}/send/${app.key}`,
      createdAt: app.createdAt,
      updatedAt: resolved.deliveryConfig.updatedAt ?? app.updatedAt,
    };
  }

  private async toLiteDetail(app: App, baseUrl: string): Promise<ManagedAppLiteDetail> {
    const resolved = await appConfigService.resolveApp(app);
    const summary = await adminIndexService.getAppSummaryById(app.id, baseUrl)
      ?? await this.buildSummaryFromResolved(app, resolved, baseUrl);
    const authProfileSummary = resolved.deliveryConfig.authProfileId
      ? await adminIndexService.getAuthProfileSummary(resolved.deliveryConfig.authProfileId)
      : null;

    return {
      ...summary,
      authProfile: authProfileSummary ?? undefined,
      connectionDetail: this.buildConnectionDetail(
        resolved.deliveryConfig.connectionMode,
        resolved.deliveryConfig.inlineWebhook?.webhookUrl
          ?? this.readRuntimeWebhookUrl(resolved.runtimeChannel),
        resolved.deliveryConfig.inlineWebhook?.secret
          ?? this.readRuntimeWebhookSecret(resolved.runtimeChannel)
      ),
      legacy: resolved.legacy,
    };
  }

  private async toSummarySafe(app: App, baseUrl: string): Promise<ManagedAppSummary> {
    try {
      return await this.toSummary(app, baseUrl);
    } catch {
      return this.buildFallbackSummary(app, baseUrl);
    }
  }

  private async toLiteDetailSafe(app: App, baseUrl: string): Promise<ManagedAppLiteDetail> {
    try {
      return await this.toLiteDetail(app, baseUrl);
    } catch {
      return this.buildFallbackLiteDetail(app, baseUrl);
    }
  }

  private async buildFallbackSummary(app: App, baseUrl: string): Promise<ManagedAppSummary> {
    const deliveryType = app.channelType;
    const recipientCount = app.channelType === 'wechat'
      ? await appService.getOpenIDCount(app.id)
      : app.channelType === 'work_wechat'
        ? (app.userIds?.length ?? 0) + (app.departmentIds?.length ?? 0)
        : 0;

    return {
      id: app.id,
      key: app.key,
      name: app.name,
      deliveryType,
      connectionMode: app.channelType === 'wechat' || app.channelType === 'work_wechat'
        ? 'auth_profile_ref'
        : 'inline_webhook',
      authProfileId: app.channelType === 'wechat' || app.channelType === 'work_wechat'
        ? app.channelId
        : undefined,
      authProfileName: undefined,
      messageProfile: this.buildFallbackMessageProfile(app),
      recipientProfile: this.buildFallbackRecipientProfile(app),
      recipientCount,
      maintenanceSnapshot: undefined,
      mcpPublished: false,
      mcpDescription: undefined,
      mcpTags: [],
      sendUrl: `${baseUrl || ''}/send/${app.key}`,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  private async buildFallbackLiteDetail(app: App, baseUrl: string): Promise<ManagedAppLiteDetail> {
    const summary = await this.buildFallbackSummary(app, baseUrl);
    const connection = await this.buildFallbackConnectionDetail(app);

    return {
      ...summary,
      authProfile: undefined,
      connectionDetail: connection,
      legacy: {
        usesLegacyChannel: app.channelType === 'wechat' || app.channelType === 'work_wechat',
        usesInlineWebhookFallback: app.channelType === 'dingtalk' || app.channelType === 'feishu',
      },
    };
  }

  private buildFallbackMessageProfile(app: App): AppMessageProfile {
    if (app.channelType === 'wechat') {
      return {
        renderer: 'text',
        defaultSendType: app.messageType === MessageTypes.TEMPLATE ? 'page' : 'text',
      };
    }

    if (app.channelType === 'work_wechat') {
      return {
        renderer: 'text',
        defaultSendType: app.messageType === 'template_card' ? 'page' : 'text',
      };
    }

    return {
      renderer: 'text',
      atMobiles: app.atMobiles,
      atAll: app.atAll,
    };
  }

  private buildFallbackRecipientProfile(app: App): AppRecipientProfile {
    if (app.channelType === 'wechat') {
      return {
        mode: app.pushMode ?? PushModes.SINGLE,
        pushMode: app.pushMode ?? PushModes.SINGLE,
      };
    }

    if (app.channelType === 'work_wechat') {
      return {
        mode: 'fixed_targets',
        userIds: app.userIds ?? [],
        departmentIds: app.departmentIds ?? [],
      };
    }

    return {
      mode: 'none',
    };
  }

  private async countRecipientsSafe(app: App): Promise<number> {
    try {
      return await this.getRecipientCount(app);
    } catch {
      if (app.channelType === 'work_wechat') {
        return (app.userIds?.length ?? 0) + (app.departmentIds?.length ?? 0);
      }
      if (app.channelType === 'wechat') {
        try {
          return await appService.getOpenIDCount(app.id);
        } catch {
          return 0;
        }
      }
      return 0;
    }
  }

  private async getTotalRecipientsFromIndex(): Promise<number> {
    const meta = await appsKV.get<{ totalRecipients?: number }>(KVKeys.APP_META);
    return meta?.totalRecipients ?? 0;
  }

  private async getRecipientCount(app: App, resolved?: Awaited<ReturnType<typeof appConfigService.resolveApp>>): Promise<number> {
    if (app.channelType === 'wechat') {
      return appService.getOpenIDCount(app.id);
    }

    if (app.channelType === 'work_wechat') {
      const recipientProfile = resolved?.deliveryConfig.recipientProfile;
      return (recipientProfile?.userIds?.length ?? app.userIds?.length ?? 0)
        + (recipientProfile?.departmentIds?.length ?? app.departmentIds?.length ?? 0);
    }

    return 0;
  }

  private validateCreateInput(input: CreateManagedAppInput): void {
    if (!input.name?.trim()) {
      throw ApiError.badRequest('App name is required');
    }

    if ((input.deliveryType === 'dingtalk' || input.deliveryType === 'feishu') && input.connection.mode !== 'inline_webhook') {
      throw ApiError.badRequest('Webhook apps must use inline webhook connection');
    }

    if ((input.deliveryType === 'wechat' || input.deliveryType === 'work_wechat') && input.connection.mode === 'inline_webhook') {
      throw ApiError.badRequest('Auth-based apps must use an auth profile');
    }
  }

  private async resolveAuthProfileId(input: CreateManagedAppInput): Promise<string | undefined> {
    if (input.connection.mode === 'auth_profile_ref') {
      const authProfile = await authProfileService.getRawById(input.connection.authProfileId);
      if (!authProfile) {
        throw ApiError.badRequest('Auth profile not found');
      }

      if (authProfile.type !== input.deliveryType) {
        throw ApiError.badRequest('Auth profile type does not match app delivery type');
      }

      return authProfile.id;
    }

    if (input.connection.mode === 'auth_profile_draft') {
      const authProfile = await authProfileService.create(input.connection.authProfile);
      return authProfile.id;
    }

    return undefined;
  }

  private async createAppRecord(input: CreateManagedAppInput, authProfileId?: string): Promise<App> {
    const id = generateAppId();
    const key = await this.generateUniqueAppKey();
    const timestamp = now();

    let app: App;
    if (input.deliveryType === 'wechat') {
      app = {
        id,
        key,
        name: input.name.trim(),
        channelId: authProfileId || '',
        channelType: 'wechat',
        pushMode: input.recipientProfile?.pushMode ?? PushModes.SINGLE,
        messageType: MessageTypes.NORMAL,
        createdAt: timestamp,
        updatedAt: timestamp,
      } satisfies WeChatAppConfig;
    } else if (input.deliveryType === 'work_wechat') {
      app = {
        id,
        key,
        name: input.name.trim(),
        channelId: authProfileId || '',
        channelType: 'work_wechat',
        messageType: 'text',
        userIds: input.recipientProfile?.userIds,
        departmentIds: input.recipientProfile?.departmentIds,
        createdAt: timestamp,
        updatedAt: timestamp,
      } satisfies WorkWeChatAppConfig;
    } else {
      app = {
        id,
        key,
        name: input.name.trim(),
        channelId: `inline:${id}`,
        channelType: input.deliveryType,
        atMobiles: input.connection.mode === 'inline_webhook' ? input.connection.atMobiles : undefined,
        atAll: input.connection.mode === 'inline_webhook' ? input.connection.atAll : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      } satisfies WebhookAppConfig;
    }

    await appsKV.putMany<unknown>([
      { key: KVKeys.APP(id), value: app },
      { key: KVKeys.APP_INDEX(key), value: id },
    ]);
    const appList = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    appList.push(id);
    await appsKV.put(KVKeys.APP_LIST, appList);

    return app;
  }

  private buildDeliveryConfig(app: App, input: CreateManagedAppInput, authProfileId?: string): AppDeliveryConfig {
    const defaultTemplateProfile = this.findDefaultTemplateProfile(input.messageProfile.templateProfiles);
    const effectiveTemplateId = defaultTemplateProfile?.templateId ?? input.messageProfile.templateId;
    const isSimplifiedDelivery = input.deliveryType === 'wechat' || input.deliveryType === 'work_wechat';
    const simplifiedDefaultSendType = input.messageProfile.defaultSendType ?? 'text';

    return {
      appId: app.id,
      deliveryType: input.deliveryType,
      connectionMode: input.connection.mode === 'inline_webhook' ? 'inline_webhook' : 'auth_profile_ref',
      authProfileId,
      inlineWebhook: input.connection.mode === 'inline_webhook'
        ? {
            webhookUrl: input.connection.webhookUrl,
            secret: input.connection.secret,
            atMobiles: input.connection.atMobiles,
            atAll: input.connection.atAll,
          }
        : undefined,
      mcpPublished: input.mcp?.published === true,
      mcpDescription: input.mcp?.description?.trim() || undefined,
      mcpTags: Array.from(new Set((input.mcp?.tags ?? []).map((tag) => tag.trim()).filter(Boolean))),
      messageProfile: isSimplifiedDelivery
        ? {
            renderer: 'text',
            defaultSendType: simplifiedDefaultSendType,
          }
        : {
            renderer: input.messageProfile.renderer,
            contentFormatDefault: input.messageProfile.contentFormatDefault ?? 'text',
            jumpBehavior: input.messageProfile.jumpBehavior ?? 'direct_first',
            templateId: effectiveTemplateId,
            fieldMap: input.messageProfile.fieldMap,
            templateProfiles: input.messageProfile.templateProfiles,
            fallbackToText: input.messageProfile.fallbackToText ?? true,
            atMobiles: input.messageProfile.atMobiles,
            atAll: input.messageProfile.atAll,
          },
      recipientProfile: this.buildRecipientProfile(input),
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  private buildRecipientProfile(input: CreateManagedAppInput): AppRecipientProfile {
    if (input.deliveryType === 'wechat') {
      return {
        mode: input.recipientProfile?.pushMode ?? PushModes.SINGLE,
        pushMode: input.recipientProfile?.pushMode ?? PushModes.SINGLE,
      };
    }

    if (input.deliveryType === 'work_wechat') {
      return {
        mode: 'fixed_targets',
        userIds: input.recipientProfile?.userIds ?? [],
        departmentIds: input.recipientProfile?.departmentIds ?? [],
      };
    }

    return {
      mode: 'none',
    };
  }

  private applyAppRecordUpdates(
    app: App,
    input: UpdateManagedAppInput,
    connectionMode: 'inline_webhook' | 'auth_profile_ref',
    authProfileId?: string
  ): App {
    const updatedAt = now();
    const nextName = input.name?.trim() || app.name;

    if (app.channelType === 'wechat') {
      return {
        ...app,
        name: nextName,
        channelId: authProfileId ?? app.channelId,
        pushMode: input.recipientProfile?.pushMode ?? app.pushMode,
        messageType: MessageTypes.NORMAL,
        templateId: undefined,
        updatedAt,
      };
    }

    if (app.channelType === 'work_wechat') {
      return {
        ...app,
        name: nextName,
        channelId: authProfileId ?? app.channelId,
        messageType: 'text',
        userIds: input.recipientProfile?.userIds ?? app.userIds,
        departmentIds: input.recipientProfile?.departmentIds ?? app.departmentIds,
        updatedAt,
      };
    }

    if (connectionMode !== 'inline_webhook') {
      throw ApiError.badRequest('Webhook apps must keep inline connection mode');
    }

    return {
      ...app,
      name: nextName,
      atMobiles: input.messageProfile?.atMobiles
        ?? (input.connection?.mode === 'inline_webhook' ? input.connection.atMobiles : app.atMobiles),
      atAll: input.messageProfile?.atAll
        ?? (input.connection?.mode === 'inline_webhook' ? input.connection.atAll : app.atAll),
      updatedAt,
    };
  }

  private mapOpenIdRecipient(recipient: OpenID): AppRecipientView {
    return {
      id: recipient.id,
      kind: 'openid',
      label: recipient.nickname || recipient.openId,
      detail: recipient.openId,
      avatar: recipient.avatar,
    };
  }

  private async buildFallbackConnectionDetail(app: App) {
    if (app.channelType === 'wechat' || app.channelType === 'work_wechat') {
      return {
        mode: 'auth_profile_ref' as const,
        status: app.channelId ? ('configured' as const) : ('missing' as const),
      };
    }

    const storedConfig = await appConfigService.getByAppId(app.id);
    const storedWebhookUrl = storedConfig?.inlineWebhook?.webhookUrl;
    const storedSecret = storedConfig?.inlineWebhook?.secret;
    const legacyChannel = app.channelId ? await channelService.getById(app.channelId) : null;
    const legacyConfig = legacyChannel?.type === app.channelType ? legacyChannel.config as { webhookUrl?: string; secret?: string } : null;
    const webhookUrl = storedWebhookUrl ?? legacyConfig?.webhookUrl;
    const secret = storedSecret ?? legacyConfig?.secret;

    return this.buildConnectionDetail('inline_webhook', webhookUrl, secret);
  }

  private buildConnectionDetail(
    mode: 'inline_webhook' | 'auth_profile_ref',
    webhookUrl?: string,
    secret?: string
  ) {
    if (mode === 'auth_profile_ref') {
      return {
        mode,
        status: 'configured' as const,
      };
    }

    return {
      mode,
      status: webhookUrl ? 'configured' as const : 'missing' as const,
      maskedWebhookUrl: webhookUrl ? maskWebhookUrl(webhookUrl) : undefined,
      secretConfigured: Boolean(secret),
    };
  }

  private readRuntimeWebhookUrl(channel: { config?: unknown }) {
    const config = channel.config as { webhookUrl?: string } | undefined;
    return config?.webhookUrl;
  }

  private readRuntimeWebhookSecret(channel: { config?: unknown }) {
    const config = channel.config as { secret?: string } | undefined;
    return config?.secret;
  }

  private async generateUniqueAppKey(): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
      const key = generateAppKey();
      const existing = await appsKV.get<string>(KVKeys.APP_INDEX(key));
      if (!existing) {
        return key;
      }
      attempts += 1;
    }

    throw ApiError.internal('Failed to generate unique app key');
  }

  private findDefaultTemplateProfile(profiles?: TemplateProfile[]): TemplateProfile | undefined {
    if (!profiles?.length) {
      return undefined;
    }

    return profiles.find((item) => item.isDefault) ?? profiles[0];
  }
}

export const appOrchestratorService = new AppOrchestratorService();
