import { appsKV, channelsKV } from '../shared/kv-client.js';
import { now } from '../shared/utils.js';
import type { App } from '../types/app.js';
import type { ChannelConfig, ChannelType } from '../types/channel.js';
import type { AppResolvedConfig } from '../types/app-config.js';
import { KVKeys, PushModes } from '../types/constants.js';
import { appService } from './app.service.js';
import { appConfigService } from './app-config.service.js';
import { openidService } from './openid.service.js';
import { isWeChatApp, isWorkWeChatApp } from '../shared/type-guards.js';

export interface SendAppSnapshot {
  id: string;
  key: string;
  name: string;
  channelType: App['channelType'];
}

export interface SendMessageProfile {
  renderer: AppResolvedConfig['renderer'];
  defaultSendType?: AppResolvedConfig['defaultSendType'];
  contentFormatDefault?: AppResolvedConfig['contentFormatDefault'];
  jumpBehavior?: AppResolvedConfig['jumpBehavior'];
  templateId?: AppResolvedConfig['templateId'];
  fieldMap?: AppResolvedConfig['fieldMap'];
  templateProfiles?: AppResolvedConfig['templateProfiles'];
  fallbackToText?: AppResolvedConfig['fallbackToText'];
  atMobiles?: AppResolvedConfig['atMobiles'];
  atAll?: AppResolvedConfig['atAll'];
}

export interface SendChannelSnapshot {
  id: string;
  type: ChannelType;
  config: ChannelConfig;
}

export interface AppSendProfile {
  app: SendAppSnapshot;
  message: SendMessageProfile;
  channel: SendChannelSnapshot;
  targets: string[];
  updatedAt: string;
}

function isSendProfile(value: unknown): value is AppSendProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Partial<AppSendProfile>;
  return Boolean(
    profile.app
      && typeof profile.app === 'object'
      && profile.message
      && typeof profile.message === 'object'
      && Array.isArray(profile.targets)
      && profile.channel
      && typeof profile.channel === 'object'
  );
}

class SendProfileService {
  async getByAppKey(appKey: string): Promise<AppSendProfile | null> {
    const exact = await appsKV.get<AppSendProfile>(KVKeys.APP_SEND_PROFILE(appKey));
    if (isSendProfile(exact)) {
      return exact;
    }

    const app = await appService.getByKey(appKey);
    if (!app) {
      return null;
    }

    return this.syncByApp(app);
  }

  async syncByAppId(appId: string): Promise<AppSendProfile | null> {
    const app = await appService.getById(appId);
    if (!app) {
      return null;
    }

    return this.syncByApp(app);
  }

  async syncByApp(app: App): Promise<AppSendProfile> {
    const profile = await this.build(app);
    await appsKV.put(KVKeys.APP_SEND_PROFILE(app.key), profile);
    return profile;
  }

  async syncByAuthProfileId(authProfileId: string): Promise<void> {
    const appIds = (await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_USAGE(authProfileId))) || [];
    if (appIds.length === 0) {
      return;
    }

    await Promise.all(appIds.map((appId) => this.syncByAppId(appId)));
  }

  async removeByAppId(appId: string): Promise<void> {
    const app = await appService.getById(appId);
    if (!app) {
      return;
    }

    await this.removeByAppKey(app.key);
  }

  async removeByAppKey(appKey: string): Promise<void> {
    await appsKV.delete(KVKeys.APP_SEND_PROFILE(appKey));
  }

  private async build(app: App): Promise<AppSendProfile> {
    const resolvedContext = await appConfigService.resolveApp(app);
    const targets = await this.resolveTargets(app, resolvedContext.resolved);

    return {
      app: {
        id: app.id,
        key: app.key,
        name: app.name,
        channelType: app.channelType,
      },
      message: {
        renderer: resolvedContext.resolved.renderer,
        defaultSendType: resolvedContext.resolved.defaultSendType,
        contentFormatDefault: resolvedContext.resolved.contentFormatDefault,
        jumpBehavior: resolvedContext.resolved.jumpBehavior,
        templateId: resolvedContext.resolved.templateId,
        fieldMap: resolvedContext.resolved.fieldMap,
        templateProfiles: resolvedContext.resolved.templateProfiles,
        fallbackToText: resolvedContext.resolved.fallbackToText,
        atMobiles: resolvedContext.resolved.atMobiles,
        atAll: resolvedContext.resolved.atAll,
      },
      channel: {
        id: resolvedContext.runtimeChannel.id,
        type: resolvedContext.runtimeChannel.type,
        config: resolvedContext.runtimeChannel.config,
      },
      targets,
      updatedAt: now(),
    };
  }

  private async resolveTargets(
    app: App,
    resolved: {
      deliveryType: string;
      pushMode?: string;
      userIds?: string[];
      departmentIds?: string[];
    }
  ): Promise<string[]> {
    switch (resolved.deliveryType) {
      case 'wechat': {
        if (isWeChatApp(app) && (resolved.pushMode ?? app.pushMode) === PushModes.SINGLE) {
          const openId = await openidService.getFirstOpenIdByApp(app.id);
          return openId ? [openId] : [];
        }

        return openidService.listOpenIdValuesByApp(app.id);
      }

      case 'work_wechat': {
        if (!isWorkWeChatApp(app)) {
          return [];
        }

        const targets: string[] = [];
        if (resolved.userIds?.length) {
          targets.push(...resolved.userIds);
        }
        if (resolved.departmentIds?.length) {
          targets.push(...resolved.departmentIds.map((id) => `dept_${id}`));
        }
        return targets;
      }

      case 'dingtalk':
      case 'feishu':
        return ['webhook'];

      default:
        throw new Error(`Unsupported channel type: ${resolved.deliveryType}`);
    }
  }
}

export const sendProfileService = new SendProfileService();
