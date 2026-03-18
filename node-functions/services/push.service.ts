/**
 * Push Service - 消息推送核心逻辑
 *
 * 使用策略模式处理多渠道推送：
 * - 根据渠道类型动态选择策略
 * - 支持微信、企业微信、钉钉、飞书等多种渠道
 * - 统一的推送接口，保持 send API 兼容性
 */

import { messageService } from './message.service.js';
import { generatePushId, now } from '../shared/utils.js';
import { ChannelStrategyFactory } from '../strategies/channel-strategy-factory.js';
import type { PushMessage } from '../strategies/types.js';
import type { App, Message, NormalizedMessage, PushMessageInput, PushResult } from '../types/index.js';
import { ApiError } from '../types/index.js';
import {
  type AppResolvedConfig,
  type JumpBehavior,
  type PushContentFormat,
  type SimplifiedSendType,
  type TemplateFieldMapping,
  type TemplateProfile,
  type TemplateSummaryMode,
} from '../types/app-config.js';
import { richContentService } from './rich-content.service.js';
import { messageDetailService } from './message-detail.service.js';
import { sendProfileService } from './send-profile.service.js';
import type { SendAppSnapshot, SendChannelSnapshot, SendMessageProfile } from './send-profile.service.js';
import type { Channel } from '../types/channel.js';

interface PushOptions {
  baseUrl?: string;
}

interface SelectedTemplateProfile {
  key?: string;
  templateId?: string;
  fieldMap?: Record<string, TemplateFieldMapping>;
  jumpBehavior: JumpBehavior;
  summaryMode: TemplateSummaryMode;
}

interface MessagePlan {
  normalized: NormalizedMessage;
  textFallback: string;
  templateProfile?: SelectedTemplateProfile;
}

class PushService {
  private factory: ChannelStrategyFactory;

  constructor() {
    this.factory = new ChannelStrategyFactory();
  }

  /**
   * 通过 App Key 发送消息
   */
  async push(appKey: string, message: PushMessageInput, options: PushOptions = {}): Promise<PushResult> {
    const pushId = generatePushId();
    const createdAt = now();

    const sendProfile = await sendProfileService.getByAppKey(appKey);
    if (!sendProfile) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      };
    }

    const app = sendProfile.app;
    const resolved = this.toResolvedConfig(app, sendProfile.message, sendProfile.channel);
    const channel = this.toChannel(app, sendProfile.channel);
    const targets = sendProfile.targets;

    if (targets.length === 0) {
      return {
        pushId,
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      };
    }

    const plan = await this.buildMessagePlan(
      app,
      resolved,
      message,
      pushId,
      createdAt,
      options.baseUrl
    );

    const strategy = this.factory.createStrategy(channel);
    const strategyMessage = this.buildStrategyMessage(app, resolved, plan);
    const result = await strategy.send(strategyMessage, targets);

    const messageRecord: Message = {
      id: pushId,
      direction: 'outbound',
      type: 'push',
      channelId: channel.id,
      appId: app.id,
      title: plan.normalized.title,
      desp: plan.textFallback || message.desp,
      summary: plan.normalized.summary,
      content: plan.normalized.body,
      contentFormat: plan.normalized.contentFormat,
      originalUrl: plan.normalized.originalUrl,
      detailPageToken: plan.normalized.detailPageToken,
      detailPageUrl: plan.normalized.detailPageUrl,
      jumpMode: plan.normalized.jumpMode,
      templateProfileKey: plan.normalized.templateProfileKey,
      results: result.results,
      createdAt,
    };
    void messageService.saveMessage(messageRecord).catch((error) => {
      if (process.env.DEBUG_KV_URL === 'true') {
        console.error('[PushService] Failed to save message record:', error);
      }
    });

    return {
      ...result,
      pushId,
    };
  }

  private async buildMessagePlan(
    app: SendAppSnapshot,
    resolved: AppResolvedConfig,
    input: PushMessageInput,
    pushId: string,
    createdAt: string,
    baseUrl?: string
  ): Promise<MessagePlan> {
    if (this.isSimplifiedDeliveryApp(app)) {
      return this.buildSimplifiedMessagePlan(app, resolved, input, pushId, createdAt, baseUrl);
    }

    const title = input.title.trim();
    const contentFormat = this.resolveContentFormat(input, resolved);
    const body = (input.content ?? input.desp ?? '').trim();
    const templateProfile = this.selectTemplateProfile(resolved, input.template);
    const providedUrl = input.url?.trim() || '';
    const originalUrl = providedUrl || undefined;
    const summary = await this.resolveSummary(
      title,
      body,
      contentFormat,
      input.summary?.trim() || input.short?.trim() || '',
      templateProfile?.summaryMode
    );

    let detailPageUrl: string | undefined;
    let detailPageToken: string | undefined;
    const wantsLanding = await this.shouldCreateLandingPage(app, contentFormat, templateProfile, originalUrl, body, summary);

    if (wantsLanding) {
      const snapshot = await messageDetailService.createSnapshot(
        {
          messageId: pushId,
          appId: app.id,
          appKey: app.key,
          appName: app.name,
          title,
          summary,
          body,
          contentFormat,
          originalUrl,
          createdAt,
        },
        baseUrl
      );
      detailPageUrl = snapshot.detailPageUrl;
      detailPageToken = snapshot.token;
    }

    const jumpMode = this.resolveJumpMode(templateProfile?.jumpBehavior ?? resolved.jumpBehavior ?? 'none', originalUrl, detailPageUrl);
    const textFallback = await this.buildTextFallback(title, summary, body, contentFormat, jumpMode, originalUrl, detailPageUrl);

    return {
      normalized: {
        title,
        summary,
        body,
        contentFormat,
        originalUrl,
        detailPageUrl,
        detailPageToken,
        jumpMode,
        templateProfileKey: templateProfile?.key,
      },
      textFallback,
      templateProfile,
    };
  }

  private async buildSimplifiedMessagePlan(
    app: SendAppSnapshot,
    resolved: AppResolvedConfig,
    input: PushMessageInput,
    pushId: string,
    createdAt: string,
    baseUrl?: string
  ): Promise<MessagePlan> {
    const title = input.title.trim();
    const body = (input.desp ?? '').trim();
    const messageType = this.resolveSimplifiedSendType(input, resolved);
    const requestedUrl = input.url?.trim() || undefined;
    const originalUrl = messageType === 'page' ? undefined : requestedUrl;

    if (messageType === 'page' && !body) {
      throw ApiError.badRequest('网页类型需要正文内容');
    }

    const summary = messageType === 'page'
      ? await this.buildPageSummary(body, title)
      : await richContentService.autoSummary(title, body, 'text');

    let detailPageUrl: string | undefined;
    let detailPageToken: string | undefined;
    if (messageType === 'page') {
      const snapshot = await messageDetailService.createSnapshot(
        {
          messageId: pushId,
          appId: app.id,
          appKey: app.key,
          appName: app.name,
          title,
          summary,
          body,
          contentFormat: 'text',
          createdAt,
        },
        baseUrl
      );
      detailPageUrl = snapshot.detailPageUrl;
      detailPageToken = snapshot.token;
    }

    return {
      normalized: {
        title,
        summary,
        body,
        type: messageType,
        contentFormat: 'text',
        originalUrl: messageType === 'text' ? originalUrl : undefined,
        detailPageUrl,
        detailPageToken,
        jumpMode: messageType === 'page' ? 'landing' : originalUrl ? 'direct' : 'none',
      },
      textFallback: this.buildSimplifiedTextFallback(
        title,
        body,
        summary,
        messageType,
        messageType === 'text' ? originalUrl : undefined,
        detailPageUrl
      ),
    };
  }

  private isSimplifiedDeliveryApp(app: SendAppSnapshot): boolean {
    return app.channelType === 'wechat' || app.channelType === 'work_wechat';
  }

  private resolveSimplifiedSendType(input: PushMessageInput, resolved: AppResolvedConfig): SimplifiedSendType {
    if (input.type === 'text' || input.type === 'page') {
      return input.type;
    }

    if (resolved.defaultSendType === 'text' || resolved.defaultSendType === 'page') {
      return resolved.defaultSendType;
    }

    const hasLegacyPageTraits = Boolean(
      resolved.renderer === 'template'
        || resolved.renderer === 'template_card'
        || resolved.templateId
        || resolved.templateProfiles?.length
        || (resolved.contentFormatDefault && resolved.contentFormatDefault !== 'text')
        || resolved.jumpBehavior === 'landing_only'
    );

    return hasLegacyPageTraits ? 'page' : 'text';
  }

  private async buildPageSummary(body: string, title: string): Promise<string> {
    const plainText = await richContentService.toPlainText(body, 'text');
    const base = plainText || title.trim();
    return Array.from(base).slice(0, 20).join('') || title.trim();
  }

  private buildSimplifiedTextFallback(
    title: string,
    body: string,
    summary: string,
    messageType: SimplifiedSendType,
    originalUrl?: string,
    detailPageUrl?: string
  ): string {
    const parts = [title];

    if (messageType === 'page') {
      if (summary && summary !== title) {
        parts.push(summary);
      }
      if (detailPageUrl) {
        parts.push(`详情：${detailPageUrl}`);
      }
      return parts.filter(Boolean).join('\n\n');
    }

    if (body) {
      parts.push(body);
    }
    if (originalUrl) {
      parts.push(`链接：${originalUrl}`);
    }
    return parts.filter(Boolean).join('\n\n');
  }

  private resolveContentFormat(input: PushMessageInput, resolved: AppResolvedConfig): PushContentFormat {
    if (input.format === 'markdown' || input.format === 'html' || input.format === 'text') {
      return input.format;
    }

    if (resolved.contentFormatDefault === 'markdown' || resolved.contentFormatDefault === 'html') {
      return resolved.contentFormatDefault;
    }

    return 'text';
  }

  private selectTemplateProfile(resolved: AppResolvedConfig, requestedKey?: string): SelectedTemplateProfile | undefined {
    const profiles = (resolved.templateProfiles ?? []).filter((item) => item.enabled !== false);

    if (requestedKey) {
      const requested = profiles.find((item) => item.key === requestedKey);
      if (!requested) {
        throw new Error(`Template profile not found: ${requestedKey}`);
      }
      return this.normalizeTemplateProfile(requested, resolved);
    }

    const selected = profiles.find((item) => item.isDefault) ?? profiles[0];
    if (selected) {
      return this.normalizeTemplateProfile(selected, resolved);
    }

    if (resolved.templateId) {
      return {
        key: 'default',
        templateId: resolved.templateId,
        fieldMap: resolved.fieldMap,
        jumpBehavior: resolved.jumpBehavior ?? 'direct_first',
        summaryMode: 'auto',
      };
    }

    return undefined;
  }

  private normalizeTemplateProfile(profile: TemplateProfile, resolved: AppResolvedConfig): SelectedTemplateProfile {
    return {
      key: profile.key,
      templateId: profile.templateId,
      fieldMap: profile.fieldMap,
      jumpBehavior: profile.jumpBehavior ?? resolved.jumpBehavior ?? 'direct_first',
      summaryMode: profile.summaryMode ?? 'auto',
    };
  }

  private async resolveSummary(
    title: string,
    body: string,
    format: PushContentFormat,
    requestedSummary: string,
    summaryMode?: TemplateSummaryMode
  ): Promise<string> {
    if (summaryMode === 'title_only') {
      return title;
    }

    if (summaryMode === 'summary_first' && requestedSummary) {
      return requestedSummary;
    }

    if (requestedSummary) {
      return requestedSummary;
    }

    return richContentService.autoSummary(title, body, format);
  }

  private async shouldCreateLandingPage(
    app: SendAppSnapshot,
    format: PushContentFormat,
    templateProfile: SelectedTemplateProfile | undefined,
    originalUrl: string | undefined,
    body: string,
    summary: string
  ): Promise<boolean> {
    if (app.channelType !== 'wechat') {
      return false;
    }

    if (templateProfile?.jumpBehavior === 'landing_only') {
      return Boolean(originalUrl || body || summary);
    }

    return format !== 'text';
  }

  private resolveJumpMode(
    jumpBehavior: JumpBehavior,
    originalUrl?: string,
    detailPageUrl?: string
  ): NormalizedMessage['jumpMode'] {
    if (jumpBehavior === 'none') {
      return 'none';
    }

    if (jumpBehavior === 'landing_only') {
      return detailPageUrl ? 'landing' : 'none';
    }

    if (originalUrl) {
      return 'direct';
    }

    if (detailPageUrl) {
      return 'landing';
    }

    return 'none';
  }

  private async buildTextFallback(
    title: string,
    summary: string,
    body: string,
    format: PushContentFormat,
    jumpMode: NormalizedMessage['jumpMode'],
    originalUrl?: string,
    detailPageUrl?: string
  ): Promise<string> {
    const plainBody = await richContentService.toPlainText(body, format);
    const parts = [title];

    if (summary && summary !== title) {
      parts.push(summary);
    }

    if (plainBody && plainBody !== summary) {
      parts.push(plainBody);
    }

    if (jumpMode === 'landing' && detailPageUrl) {
      parts.push(`详情：${detailPageUrl}`);
    } else if (jumpMode === 'direct' && originalUrl) {
      parts.push(`链接：${originalUrl}`);
    } else if (detailPageUrl) {
      parts.push(`详情：${detailPageUrl}`);
    } else if (originalUrl) {
      parts.push(`链接：${originalUrl}`);
    }

    return parts.filter(Boolean).join('\n\n');
  }

  private buildStrategyMessage(
    app: SendAppSnapshot,
    resolved: AppResolvedConfig,
    plan: MessagePlan
  ): PushMessage {
    if (this.isSimplifiedDeliveryApp(app)) {
      return {
        title: plan.normalized.title,
        desp: plan.textFallback,
        summary: plan.normalized.summary,
        body: plan.normalized.body,
        contentFormat: 'text',
        originalUrl: plan.normalized.originalUrl,
        detailPageUrl: plan.normalized.detailPageUrl,
        jumpUrl: plan.normalized.jumpMode === 'landing'
          ? plan.normalized.detailPageUrl
          : plan.normalized.originalUrl,
        jumpMode: plan.normalized.jumpMode,
        renderer: 'text',
      };
    }

    const jumpUrl = plan.normalized.jumpMode === 'direct'
      ? plan.normalized.originalUrl
      : plan.normalized.jumpMode === 'landing'
        ? plan.normalized.detailPageUrl
        : undefined;

    const strategyMessage: PushMessage = {
      title: plan.normalized.title,
      desp: plan.textFallback,
      summary: plan.normalized.summary,
      body: plan.normalized.body,
      contentFormat: plan.normalized.contentFormat,
      originalUrl: plan.normalized.originalUrl,
      detailPageUrl: plan.normalized.detailPageUrl,
      jumpUrl,
      jumpMode: plan.normalized.jumpMode,
      templateProfileKey: plan.normalized.templateProfileKey,
      renderer: resolved.renderer as PushMessage['renderer'],
      fallbackToText: resolved.fallbackToText,
      atMobiles: resolved.atMobiles,
      atAll: resolved.atAll,
    };

    if (app.channelType === 'wechat' && resolved.renderer === 'template' && plan.templateProfile?.templateId) {
      strategyMessage.templateId = plan.templateProfile.templateId;
      strategyMessage.templateData = this.buildTemplateData(
        plan.templateProfile.fieldMap,
        plan.normalized,
        jumpUrl
      );
    }

    return strategyMessage;
  }

  private buildTemplateData(
    fieldMap: Record<string, TemplateFieldMapping> | undefined,
    message: NormalizedMessage,
    jumpUrl?: string
  ): Record<string, { value: string }> {
    const resolvedFieldMap = fieldMap ?? {
      first: { source: 'title' },
      keyword1: { source: 'summary' },
      remark: { source: 'detail_page_url' },
    };

    return Object.fromEntries(
      Object.entries(resolvedFieldMap).map(([field, mapping]) => {
        switch (mapping.source) {
          case 'title':
            return [field, { value: message.title || '' }];
          case 'desp':
            return [field, { value: message.body || '' }];
          case 'content':
            return [field, { value: message.body || '' }];
          case 'summary':
            return [field, { value: message.summary || '' }];
          case 'url':
            return [field, { value: message.originalUrl || jumpUrl || '' }];
          case 'detail_page_url':
            return [field, { value: message.detailPageUrl || jumpUrl || '' }];
          case 'timestamp':
            return [field, { value: new Date().toLocaleString('zh-CN', { hour12: false }) }];
          case 'static':
          default:
            return [field, { value: mapping.value || '' }];
        }
      })
    );
  }

  private toResolvedConfig(
    app: SendAppSnapshot,
    message: SendMessageProfile,
    channel: SendChannelSnapshot
  ): AppResolvedConfig {
    return {
      appId: app.id,
      appKey: app.key,
      appName: app.name,
      deliveryType: app.channelType,
      runtimeChannelId: channel.id,
      renderer: message.renderer,
      defaultSendType: message.defaultSendType,
      contentFormatDefault: message.contentFormatDefault,
      jumpBehavior: message.jumpBehavior,
      templateId: message.templateId,
      fieldMap: message.fieldMap,
      templateProfiles: message.templateProfiles,
      fallbackToText: message.fallbackToText,
      atMobiles: message.atMobiles,
      atAll: message.atAll,
    };
  }

  private toChannel(app: SendAppSnapshot, channel: SendChannelSnapshot): Channel {
    return {
      id: channel.id,
      name: app.name,
      type: channel.type,
      config: channel.config,
      createdAt: '',
      updatedAt: '',
    };
  }
}

export const pushService = new PushService();
