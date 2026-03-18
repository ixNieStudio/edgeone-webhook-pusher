/**
 * Auth profile repository built on top of the legacy channel storage.
 */

import type { Channel, CreateChannelInput, UpdateChannelInput } from '../types/channel.js';
import type {
  AuthProfileConfigDisplayItem,
  AuthProfileDetail,
  AuthProfileMaintenanceStatus,
  AuthProfileSummary,
  AuthProfileUsageItem,
  DeliveryType,
  WeChatInboundMaintenanceInfo,
} from '../types/app-config.js';
import { channelService } from './channel.service.js';
import { wechatService } from './wechat.service.js';
import { workWeChatMaintenanceService } from './work-wechat-maintenance.service.js';
import { ApiError } from '../types/api.js';
import { normalizeAuthProfileMaintenanceStatus } from './auth-profile-maintenance.shared.js';
import { adminIndexService } from './admin-index.service.js';
import { appsKV, channelsKV } from '../shared/kv-client.js';
import { KVKeys } from '../types/constants.js';

const AUTH_PROFILE_TYPES = new Set<DeliveryType>(['wechat', 'work_wechat']);

function isAuthProfileType(type: DeliveryType): type is Extract<DeliveryType, 'wechat' | 'work_wechat'> {
  return AUTH_PROFILE_TYPES.has(type);
}

class AuthProfileService {
  async listRaw(): Promise<Channel[]> {
    const profileIds = (await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_LIST)) || [];
    const channelMap = await channelsKV.getMany<Channel>(profileIds.map((id) => KVKeys.CHANNEL(id)));
    const authProfiles = profileIds
      .map((id) => channelMap[KVKeys.CHANNEL(id)] ?? null)
      .filter((channel): channel is Channel => isAuthProfileType(channel?.type as DeliveryType));
    await Promise.allSettled(authProfiles.map((channel) => this.ensureMaintenance(channel)));
    return authProfiles;
  }

  async list(): Promise<AuthProfileSummary[]> {
    return adminIndexService.listAuthProfileSummaries();
  }

  async getRawById(id: string): Promise<Channel | null> {
    const channel = await channelService.getById(id);
    if (!channel || !isAuthProfileType(channel.type)) {
      return null;
    }
    return channel;
  }

  async getDetail(id: string, baseUrl: string): Promise<AuthProfileDetail> {
    const channel = await this.getRawById(id);
    if (!channel) {
      throw ApiError.notFound('Auth profile not found');
    }

    await this.ensureMaintenance(channel);
    await adminIndexService.syncAuthProfile(channel);

    const [usage, maintenance, summary] = await Promise.all([
      this.getUsage(channel.id),
      this.getMaintenance(channel),
      adminIndexService.getAuthProfileSummary(channel.id),
    ]);

    return {
      ...(summary || this.buildSummary(channel, maintenance, usage.length)),
      configDisplay: this.buildConfigDisplay(channel),
      maintenance,
      usage,
      ...(channel.type === 'wechat'
        ? {
            wechatInbound: this.buildWeChatInboundInfo(channel, baseUrl),
          }
        : {}),
    };
  }

  async verify(id: string): Promise<AuthProfileMaintenanceStatus> {
    const channel = await this.getRawById(id);
    if (!channel) {
      throw ApiError.notFound('Auth profile not found');
    }

    if (channel.type === 'wechat') {
      await wechatService.verifyChannelConfig(channel);
      await adminIndexService.syncAuthProfile(channel);
      return this.getMaintenance(channel);
    }

    await workWeChatMaintenanceService.verifyChannelConfig(channel);
    await adminIndexService.syncAuthProfile(channel);
    return this.getMaintenance(channel);
  }

  async create(input: {
    name: string;
    type: Extract<DeliveryType, 'wechat' | 'work_wechat'>;
    config: Record<string, unknown>;
  }): Promise<AuthProfileSummary> {
    if (!isAuthProfileType(input.type)) {
      throw ApiError.badRequest('Unsupported auth profile type');
    }

    const channel = await channelService.create({
      name: input.name,
      type: input.type,
      config: input.config as unknown as CreateChannelInput['config'],
    });

    await adminIndexService.syncAuthProfile(channel);
    const summary = await adminIndexService.getAuthProfileSummary(channel.id);
    return summary || this.buildSummary(channel, await this.getMaintenance(channel), 0);
  }

  async update(
    id: string,
    input: {
      name?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<AuthProfileSummary> {
    const channel = await this.getRawById(id);
    if (!channel) {
      throw ApiError.notFound('Auth profile not found');
    }

    const updated = await channelService.update(id, {
      name: input.name,
      config: input.config as unknown as UpdateChannelInput['config'],
    });

    await adminIndexService.syncAuthProfile(updated);
    const { sendProfileService } = await import('./send-profile.service.js');
    await sendProfileService.syncByAuthProfileId(updated.id);
    const summary = await adminIndexService.getAuthProfileSummary(updated.id);
    return summary || this.buildSummary(updated, await this.getMaintenance(updated), await this.getUsageCount(updated.id));
  }

  toSummary(channel: Channel): AuthProfileSummary {
    return this.buildSummary(channel, normalizeAuthProfileMaintenanceStatus(null), 0);
  }

  private async getMaintenance(channel: Channel): Promise<AuthProfileMaintenanceStatus> {
    const rawStatus = channel.type === 'wechat'
      ? await wechatService.getTokenStatus(channel.id)
      : await workWeChatMaintenanceService.getTokenStatus(channel.id);

    return normalizeAuthProfileMaintenanceStatus(rawStatus);
  }

  private async ensureMaintenance(channel: Channel): Promise<void> {
    if (channel.type === 'wechat') {
      await wechatService.ensureTokenMaintenance(channel);
      return;
    }

    await workWeChatMaintenanceService.ensureTokenMaintenance(channel);
  }

  private buildConfigDisplay(channel: Channel): AuthProfileConfigDisplayItem[] {
    const masked = channelService.maskChannel(channel);

    if (masked.type === 'wechat') {
      const config = masked.config as { appId?: string; appSecret?: string };
      return [
        { key: 'appId', label: 'AppID', value: String(config.appId || '') },
        { key: 'appSecret', label: 'AppSecret', value: String(config.appSecret || ''), masked: true },
      ];
    }

    const config = masked.config as { corpId?: string; agentId?: number; corpSecret?: string };
    return [
      { key: 'corpId', label: 'CorpID', value: String(config.corpId || '') },
      { key: 'agentId', label: 'AgentID', value: String(config.agentId || '') },
      { key: 'corpSecret', label: 'CorpSecret', value: String(config.corpSecret || ''), masked: true },
    ];
  }

  private async getUsage(channelId: string): Promise<AuthProfileUsageItem[]> {
    const appIds = (await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_USAGE(channelId))) || [];
    if (appIds.length === 0) {
      return [];
    }

    const appMap = await appsKV.getMany<any>(appIds.map((id) => KVKeys.APP(id)));
    return appIds
      .map((id) => appMap[KVKeys.APP(id)] ?? null)
      .filter((app): app is { id: string; key: string; name: string; channelType: DeliveryType; updatedAt: string } => Boolean(app))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((app) => ({
        appId: app.id,
        appKey: app.key,
        appName: app.name,
        deliveryType: app.channelType as AuthProfileUsageItem['deliveryType'],
      }));
  }

  private async getUsageCount(channelId: string): Promise<number> {
    const appIds = await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_USAGE(channelId));
    return appIds?.length ?? 0;
  }

  private buildSummary(
    channel: Channel,
    maintenance: ReturnType<typeof normalizeAuthProfileMaintenanceStatus>,
    usageCount: number
  ): AuthProfileSummary {
    const masked = channelService.maskChannel(channel);
    return {
      id: masked.id,
      name: masked.name,
      type: masked.type as Extract<DeliveryType, 'wechat' | 'work_wechat'>,
      config: masked.config as unknown as Record<string, unknown>,
      maintenanceSnapshot: maintenance,
      usageCount,
      createdAt: masked.createdAt,
      updatedAt: masked.updatedAt,
    };
  }

  private buildWeChatInboundInfo(channel: Channel, requestBaseUrl: string): WeChatInboundMaintenanceInfo {
    const resolvedEnvBaseUrl = process.env.KV_BASE_URL?.trim().replace(/\/+$/, '');
    const fallbackBaseUrl = requestBaseUrl.trim().replace(/\/+$/, '');
    const baseUrl = resolvedEnvBaseUrl || fallbackBaseUrl;
    const config = channel.config as { msgToken?: string };

    return {
      callbackUrl: `${baseUrl}/v1/wechat/${channel.id}`,
      baseUrlSource: resolvedEnvBaseUrl ? 'env' : 'request',
      msgToken: config.msgToken || '',
    };
  }
}

export const authProfileService = new AuthProfileService();
