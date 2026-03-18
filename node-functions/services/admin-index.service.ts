import { appsKV, channelsKV, openidsKV } from '../shared/kv-client.js';
import { now } from '../shared/utils.js';
import type { App } from '../types/app.js';
import type { Channel } from '../types/channel.js';
import {
  type AppCollectionMeta,
  type AppSummaryIndexRecord,
  type AuthProfileCollectionMeta,
  type AuthProfileMaintenanceStatus,
  type AuthProfileSummary,
  type AuthProfileSummaryIndexRecord,
  type DeliveryType,
  type IndexCollectionStatus,
  type ManagedAppSummary,
} from '../types/app-config.js';
import { KVKeys } from '../types/constants.js';
import { appConfigService } from './app-config.service.js';
import { channelService } from './channel.service.js';
import { normalizeAuthProfileMaintenanceStatus } from './auth-profile-maintenance.shared.js';
import { wechatService } from './wechat.service.js';
import { workWeChatMaintenanceService } from './work-wechat-maintenance.service.js';

const APP_INDEX_VERSION = 1;
const AUTH_PROFILE_INDEX_VERSION = 1;
const REPAIR_FAILURE_TTL_SECONDS = 120;
const TOKEN_REFRESH_BUFFER_MS = 15 * 60 * 1000;
const FAILED_STATUS_RETRY_MS = 5 * 60 * 1000;

type RepairDomain = 'apps' | 'auth_profiles';
type RepairSource = 'auto' | 'manual' | 'write';

interface RepairFailureRecord {
  failedAt: string;
  error: string;
}

interface AppIndexState {
  ids: string[];
  summaries: AppSummaryIndexRecord[];
  meta: AppCollectionMeta;
}

interface AuthProfileIndexState {
  ids: string[];
  summaries: AuthProfileSummaryIndexRecord[];
  meta: AuthProfileCollectionMeta;
}

function isAuthProfileChannel(channel: Channel | null | undefined): channel is Channel & {
  type: Extract<DeliveryType, 'wechat' | 'work_wechat'>;
} {
  return Boolean(channel && (channel.type === 'wechat' || channel.type === 'work_wechat'));
}

function buildSendUrl(baseUrl: string, appKey: string) {
  return `${baseUrl || ''}/send/${appKey}`;
}

function hasObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isMaintenanceSnapshot(value: unknown): value is AuthProfileMaintenanceStatus {
  return hasObject(value)
    && typeof value.status === 'string'
    && typeof value.valid === 'boolean'
    && typeof value.lastRefreshSuccess === 'boolean'
    && typeof value.supportsVerification === 'boolean';
}

function isAppSummaryRecord(value: unknown): value is AppSummaryIndexRecord {
  return hasObject(value)
    && typeof value.id === 'string'
    && typeof value.key === 'string'
    && typeof value.name === 'string'
    && typeof value.deliveryType === 'string'
    && typeof value.connectionMode === 'string'
    && hasObject(value.messageProfile)
    && hasObject(value.recipientProfile)
    && typeof value.recipientCount === 'number'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string';
}

function isAppMeta(value: unknown): value is AppCollectionMeta {
  return hasObject(value)
    && typeof value.version === 'number'
    && typeof value.total === 'number'
    && typeof value.summaryCount === 'number'
    && typeof value.totalRecipients === 'number'
    && hasObject(value.countsByDeliveryType)
    && typeof value.updatedAt === 'string';
}

function isAuthProfileSummaryRecord(value: unknown): value is AuthProfileSummaryIndexRecord {
  return hasObject(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.type === 'string'
    && hasObject(value.config)
    && typeof value.usageCount === 'number'
    && isMaintenanceSnapshot(value.maintenanceSnapshot)
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string';
}

function isAuthProfileMeta(value: unknown): value is AuthProfileCollectionMeta {
  return hasObject(value)
    && typeof value.version === 'number'
    && typeof value.total === 'number'
    && typeof value.summaryCount === 'number'
    && hasObject(value.countsByType)
    && typeof value.updatedAt === 'string';
}

function shouldRefreshMaintenance(snapshot: AuthProfileMaintenanceStatus | undefined, nowTs = Date.now()) {
  if (!snapshot?.lastRefreshAt) {
    return true;
  }

  if (!snapshot.lastRefreshSuccess || !snapshot.valid) {
    return nowTs - snapshot.lastRefreshAt >= FAILED_STATUS_RETRY_MS;
  }

  if (typeof snapshot.expiresAt !== 'number') {
    return true;
  }

  return snapshot.expiresAt - nowTs <= TOKEN_REFRESH_BUFFER_MS;
}

class AdminIndexService {
  private repairPromises = new Map<RepairDomain, Promise<void>>();

  async listAppSummaries(baseUrl: string): Promise<ManagedAppSummary[]> {
    const state = await this.ensureAppIndexState();
    return state.summaries
      .map((summary) => this.mapAppSummary(summary, baseUrl))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getAppSummaryById(appId: string, baseUrl: string): Promise<ManagedAppSummary | null> {
    const summary = await this.getExactAppSummaryRecord(appId);
    return summary ? this.mapAppSummary(summary, baseUrl) : null;
  }

  async listAuthProfileSummaries(): Promise<AuthProfileSummary[]> {
    const state = await this.ensureAuthProfileIndexState({ refreshMaintenance: true });
    return state.summaries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getAuthProfileSummary(id: string, options?: { refreshMaintenance?: boolean }): Promise<AuthProfileSummary | null> {
    return await this.getExactAuthProfileSummaryRecord(id, options) ?? null;
  }

  async getIndexStatus(): Promise<{
    apps: IndexCollectionStatus;
    authProfiles: IndexCollectionStatus;
  }> {
    const [appIds, appMeta, authIds, authMeta] = await Promise.all([
      appsKV.get<string[]>(KVKeys.APP_LIST),
      appsKV.get<AppCollectionMeta>(KVKeys.APP_META),
      channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_LIST),
      channelsKV.get<AuthProfileCollectionMeta>(KVKeys.AUTH_PROFILE_META),
    ]);

    return {
      apps: this.toIndexStatus(appMeta, appIds?.length ?? 0, APP_INDEX_VERSION),
      authProfiles: this.toIndexStatus(authMeta, authIds?.length ?? 0, AUTH_PROFILE_INDEX_VERSION),
    };
  }

  async repair(domain: RepairDomain | 'all', source: RepairSource = 'manual'): Promise<void> {
    if (domain === 'all') {
      await this.repairDomain('apps', source);
      await this.repairDomain('auth_profiles', source);
      return;
    }

    await this.repairDomain(domain, source);
  }

  async syncApp(app: App, options?: { previousAuthProfileId?: string }): Promise<void> {
    const summary = await this.buildAppSummaryRecord(app);
    const currentAuthProfileId = summary.authProfileId;
    const previousAuthProfileId = options?.previousAuthProfileId;

    await appsKV.put(KVKeys.APP_SUMMARY(app.id), summary);
    await this.ensureAppListMembership(app.id);
    await appsKV.put(KVKeys.APP_INDEX(app.key), app.id);

    if (previousAuthProfileId && previousAuthProfileId !== currentAuthProfileId) {
      await this.removeUsage(previousAuthProfileId, app.id);
    }
    if (currentAuthProfileId) {
      await this.addUsage(currentAuthProfileId, app.id);
    }

    await this.rebuildAppMeta({ source: 'write' });

    if (previousAuthProfileId && previousAuthProfileId !== currentAuthProfileId) {
      const previousChannel = await channelService.getById(previousAuthProfileId);
      if (isAuthProfileChannel(previousChannel)) {
        await this.syncAuthProfile(previousChannel);
      }
    }

    if (currentAuthProfileId && currentAuthProfileId !== previousAuthProfileId) {
      const currentChannel = await channelService.getById(currentAuthProfileId);
      if (isAuthProfileChannel(currentChannel)) {
        await this.syncAuthProfile(currentChannel);
      }
    }
  }

  async removeApp(app: App, options?: { authProfileId?: string }): Promise<void> {
    await appsKV.delete(KVKeys.APP_SUMMARY(app.id));
    await this.removeAppListMembership(app.id);
    await appsKV.delete(KVKeys.APP_INDEX(app.key));

    const authProfileId = options?.authProfileId
      ?? (app.channelType === 'wechat' || app.channelType === 'work_wechat' ? app.channelId : undefined);

    if (authProfileId) {
      await this.removeUsage(authProfileId, app.id);
      const channel = await channelService.getById(authProfileId);
      if (isAuthProfileChannel(channel)) {
        await this.syncAuthProfile(channel);
      }
    }

    await this.rebuildAppMeta({ source: 'write' });
  }

  async syncAppRecipientCount(appId: string): Promise<void> {
    const [summary, meta] = await Promise.all([
      appsKV.get<AppSummaryIndexRecord>(KVKeys.APP_SUMMARY(appId)),
      appsKV.get<AppCollectionMeta>(KVKeys.APP_META),
    ]);
    if (!summary) {
      return;
    }

    const recipientIds = (await openidsKV.get<string[]>(KVKeys.OPENID_APP(appId))) || [];
    if (summary.recipientCount === recipientIds.length && meta) {
      return;
    }

    await appsKV.put(KVKeys.APP_SUMMARY(appId), {
      ...summary,
      recipientCount: recipientIds.length,
    });
    await this.rebuildAppMeta({ source: 'write' });
  }

  async syncAuthProfile(channel: Channel): Promise<void> {
    if (!isAuthProfileChannel(channel)) {
      return;
    }

    const summary = await this.buildAuthProfileSummaryRecord(channel);
    await channelsKV.put(KVKeys.AUTH_PROFILE_SUMMARY(channel.id), summary);
    await this.ensureAuthProfileListMembership(channel.id);
    await this.rebuildAuthProfileMeta({ source: 'write' });
    await this.propagateAuthProfileSnapshot(summary);
  }

  async syncAuthProfileById(channelId: string): Promise<void> {
    const channel = await channelService.getById(channelId);
    if (!isAuthProfileChannel(channel)) {
      return;
    }

    await this.syncAuthProfile(channel);
  }

  private async ensureAppIndexState(): Promise<AppIndexState> {
    const current = await this.readAppIndexState();
    if (current) {
      return current;
    }

    const failure = await appsKV.get<RepairFailureRecord>(KVKeys.APP_REPAIR_FAILURE);
    if (!failure) {
      try {
        await this.repairDomain('apps', 'auto');
      } catch {
        const fallback = await this.buildAppIndexStateFromLegacyIndex();
        if (fallback) {
          return fallback;
        }
        throw new Error('App summary index repair failed');
      }
    }

    const repaired = await this.readAppIndexState();
    if (repaired) {
      return repaired;
    }

    const fallback = await this.buildAppIndexStateFromLegacyIndex();
    if (fallback) {
      return fallback;
    }

    return {
      ids: [],
      summaries: [],
      meta: this.buildAppMeta([], { source: 'auto' }),
    };
  }

  private async ensureAuthProfileIndexState(options?: { refreshMaintenance?: boolean }): Promise<AuthProfileIndexState> {
    let current = await this.readAuthProfileIndexState();
    if (!current) {
      const failure = await channelsKV.get<RepairFailureRecord>(KVKeys.AUTH_PROFILE_REPAIR_FAILURE);
      if (!failure) {
        try {
          await this.repairDomain('auth_profiles', 'auto');
        } catch {
          const fallback = await this.buildAuthProfileIndexStateFromLegacyIndex();
          if (fallback) {
            current = fallback;
          } else {
            throw new Error('Auth profile summary index repair failed');
          }
        }
      }

      current = current || (await this.readAuthProfileIndexState()) || (await this.buildAuthProfileIndexStateFromLegacyIndex());
    }

    if (!current) {
      return {
        ids: [],
        summaries: [],
        meta: this.buildAuthProfileMeta([], { source: 'auto' }),
      };
    }

    if (!options?.refreshMaintenance || current.summaries.length === 0) {
      return current;
    }

    const staleIds = current.summaries
      .filter((summary) => shouldRefreshMaintenance(summary.maintenanceSnapshot))
      .map((summary) => summary.id);

    if (staleIds.length === 0) {
      return current;
    }

    const rawMap = await channelsKV.getMany<Channel>(staleIds.map((id) => KVKeys.CHANNEL(id)));
    for (const profileId of staleIds) {
      const channel = rawMap[KVKeys.CHANNEL(profileId)];
      if (!isAuthProfileChannel(channel)) {
        continue;
      }

      if (channel.type === 'wechat') {
        await wechatService.ensureTokenMaintenance(channel);
      } else {
        await workWeChatMaintenanceService.ensureTokenMaintenance(channel);
      }

      await this.syncAuthProfile(channel);
    }

    return (await this.readAuthProfileIndexState()) ?? current;
  }

  private async repairDomain(domain: RepairDomain, source: RepairSource): Promise<void> {
    const existing = this.repairPromises.get(domain);
    if (existing) {
      await existing;
      return;
    }

    const promise = (domain === 'apps'
      ? this.doRepairApps(source)
      : this.doRepairAuthProfiles(source)
    ).catch(async (error) => {
      const targetKV = domain === 'apps' ? appsKV : channelsKV;
      const failureKey = domain === 'apps' ? KVKeys.APP_REPAIR_FAILURE : KVKeys.AUTH_PROFILE_REPAIR_FAILURE;
      await targetKV.put(failureKey, {
        failedAt: now(),
        error: error instanceof Error ? error.message : 'Index repair failed',
      } satisfies RepairFailureRecord, REPAIR_FAILURE_TTL_SECONDS);
      throw error;
    }).finally(() => {
      this.repairPromises.delete(domain);
    });

    this.repairPromises.set(domain, promise);
    await promise;
  }

  private async doRepairApps(source: RepairSource): Promise<void> {
    const legacyIds = await appsKV.get<string[]>(KVKeys.APP_LIST);
    const ids = legacyIds ?? await appsKV.listAll(KVKeys.APP_PREFIX);
    const uniqueIds = Array.from(new Set(ids));
    const appMap = await appsKV.getMany<App>(uniqueIds.map((id) => KVKeys.APP(id)));
    const apps = uniqueIds
      .map((id) => appMap[KVKeys.APP(id)] ?? null)
      .filter((item): item is App => item !== null);

    const summaries = await Promise.all(apps.map((app) => this.buildAppSummaryRecord(app)));
    const usageMap = this.buildUsageMap(summaries);
    const currentList = legacyIds ?? [];
    const staleIds = currentList.filter((id) => !uniqueIds.includes(id));
    const usageCandidateIds = Array.from(new Set([
      ...((await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_LIST)) || []),
      ...((await channelsKV.get<string[]>(KVKeys.CHANNEL_LIST)) || []),
      ...Array.from(usageMap.keys()),
    ]));

    await appsKV.put(KVKeys.APP_LIST, apps.map((app) => app.id));
    await Promise.all([
      appsKV.putMany<unknown>([
        ...apps.map((app) => ({ key: KVKeys.APP_INDEX(app.key), value: app.id })),
        ...summaries.map((summary) => ({ key: KVKeys.APP_SUMMARY(summary.id), value: summary })),
        { key: KVKeys.APP_META, value: this.buildAppMeta(summaries, { source }) },
      ]),
      staleIds.length > 0
        ? appsKV.deleteMany(staleIds.map((id) => KVKeys.APP_SUMMARY(id)))
        : Promise.resolve(),
      ...usageCandidateIds.map((profileId) => this.writeUsageList(profileId, usageMap.get(profileId) || [])),
      appsKV.delete(KVKeys.APP_REPAIR_FAILURE),
    ]);

    const authSummaryMap = await channelsKV.getMany<AuthProfileSummaryIndexRecord>(
      usageCandidateIds.map((id) => KVKeys.AUTH_PROFILE_SUMMARY(id))
    );
    await Promise.all(usageCandidateIds.map(async (profileId) => {
      const authSummary = authSummaryMap[KVKeys.AUTH_PROFILE_SUMMARY(profileId)];
      if (!authSummary || !isAuthProfileSummaryRecord(authSummary)) {
        return;
      }

      await channelsKV.put(KVKeys.AUTH_PROFILE_SUMMARY(profileId), {
        ...authSummary,
        usageCount: usageMap.get(profileId)?.length ?? 0,
      });
    }));
  }

  private async doRepairAuthProfiles(source: RepairSource): Promise<void> {
    const authProfileList = await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_LIST);
    const legacyChannelIds = await channelsKV.get<string[]>(KVKeys.CHANNEL_LIST);
    const scanIds = authProfileList === null && legacyChannelIds === null
      ? await channelsKV.listAll(KVKeys.CHANNEL_PREFIX)
      : [];

    const candidateIds = Array.from(new Set([...(authProfileList || []), ...(legacyChannelIds || []), ...scanIds]));
    const channelMap = await channelsKV.getMany<Channel>(candidateIds.map((id) => KVKeys.CHANNEL(id)));
    const channels = candidateIds
      .map((id) => channelMap[KVKeys.CHANNEL(id)] ?? null)
      .filter(isAuthProfileChannel);

    const usageMap = await this.rebuildUsageIndexFromApps();
    const summaries = await Promise.all(
      channels.map((channel) => this.buildAuthProfileSummaryRecord(channel, usageMap.get(channel.id)?.length ?? 0))
    );
    const currentIds = authProfileList ?? [];
    const staleIds = currentIds.filter((id) => !channels.some((channel) => channel.id === id));
    const usageCandidateIds = Array.from(new Set([...currentIds, ...channels.map((channel) => channel.id)]));

    await channelsKV.put(KVKeys.AUTH_PROFILE_LIST, channels.map((channel) => channel.id));
    await Promise.all([
      ...summaries.map((summary) => channelsKV.put(KVKeys.AUTH_PROFILE_SUMMARY(summary.id), summary)),
      ...staleIds.map((id) => channelsKV.delete(KVKeys.AUTH_PROFILE_SUMMARY(id))),
      ...usageCandidateIds.map((profileId) => this.writeUsageList(profileId, usageMap.get(profileId) || [])),
      channelsKV.put(KVKeys.AUTH_PROFILE_META, this.buildAuthProfileMeta(summaries, { source })),
      channelsKV.delete(KVKeys.AUTH_PROFILE_REPAIR_FAILURE),
    ]);
  }

  private async readAppIndexState(): Promise<AppIndexState | null> {
    const keyMap = await appsKV.getMany<string[] | AppCollectionMeta>([
      KVKeys.APP_LIST,
      KVKeys.APP_META,
    ]);
    const ids = keyMap[KVKeys.APP_LIST] as string[] | null | undefined;
    const meta = keyMap[KVKeys.APP_META] as AppCollectionMeta | null | undefined;

    if (!ids || !isAppMeta(meta) || meta.version !== APP_INDEX_VERSION || meta.summaryCount !== ids.length) {
      return null;
    }

    const summaryMap = await appsKV.getMany<AppSummaryIndexRecord>(ids.map((id) => KVKeys.APP_SUMMARY(id)));
    const summaries = ids
      .map((id) => summaryMap[KVKeys.APP_SUMMARY(id)] ?? null)
      .filter((item): item is AppSummaryIndexRecord => isAppSummaryRecord(item));

    if (summaries.length !== ids.length) {
      return null;
    }

    return {
      ids,
      summaries,
      meta,
    };
  }

  private async readAuthProfileIndexState(): Promise<AuthProfileIndexState | null> {
    const keyMap = await channelsKV.getMany<string[] | AuthProfileCollectionMeta>([
      KVKeys.AUTH_PROFILE_LIST,
      KVKeys.AUTH_PROFILE_META,
    ]);
    const ids = keyMap[KVKeys.AUTH_PROFILE_LIST] as string[] | null | undefined;
    const meta = keyMap[KVKeys.AUTH_PROFILE_META] as AuthProfileCollectionMeta | null | undefined;

    if (!ids || !isAuthProfileMeta(meta) || meta.version !== AUTH_PROFILE_INDEX_VERSION || meta.summaryCount !== ids.length) {
      return null;
    }

    const summaryMap = await channelsKV.getMany<AuthProfileSummaryIndexRecord>(ids.map((id) => KVKeys.AUTH_PROFILE_SUMMARY(id)));
    const summaries = ids
      .map((id) => summaryMap[KVKeys.AUTH_PROFILE_SUMMARY(id)] ?? null)
      .filter((item): item is AuthProfileSummaryIndexRecord => isAuthProfileSummaryRecord(item));

    if (summaries.length !== ids.length) {
      return null;
    }

    return {
      ids,
      summaries,
      meta,
    };
  }

  private async buildAppIndexStateFromLegacyIndex(): Promise<AppIndexState | null> {
    const ids = await appsKV.get<string[]>(KVKeys.APP_LIST);
    if (!ids) {
      return null;
    }

    const appMap = await appsKV.getMany<App>(ids.map((id) => KVKeys.APP(id)));
    const apps = ids
      .map((id) => appMap[KVKeys.APP(id)] ?? null)
      .filter((item): item is App => item !== null);
    const summaries = await Promise.all(apps.map((app) => this.buildAppSummaryRecord(app)));

    return {
      ids: apps.map((app) => app.id),
      summaries,
      meta: this.buildAppMeta(summaries, { source: 'auto' }),
    };
  }

  private async buildAuthProfileIndexStateFromLegacyIndex(): Promise<AuthProfileIndexState | null> {
    const ids = await channelsKV.get<string[]>(KVKeys.CHANNEL_LIST);
    if (!ids) {
      return null;
    }

    const channelMap = await channelsKV.getMany<Channel>(ids.map((id) => KVKeys.CHANNEL(id)));
    const channels = ids
      .map((id) => channelMap[KVKeys.CHANNEL(id)] ?? null)
      .filter(isAuthProfileChannel);
    const usageMap = await this.rebuildUsageIndexFromApps();
    const summaries = await Promise.all(
      channels.map((channel) => this.buildAuthProfileSummaryRecord(channel, usageMap.get(channel.id)?.length ?? 0))
    );

    return {
      ids: channels.map((channel) => channel.id),
      summaries,
      meta: this.buildAuthProfileMeta(summaries, { source: 'auto' }),
    };
  }

  private async buildAppSummaryRecord(app: App): Promise<AppSummaryIndexRecord> {
    const resolved = await appConfigService.resolveApp(app);
    const authProfileId = resolved.deliveryConfig.authProfileId;
    const authProfileSummary = authProfileId
      ? await this.resolveAuthProfileSummary(authProfileId, resolved.authProfile ?? undefined)
      : null;

    return {
      id: app.id,
      key: app.key,
      name: app.name,
      deliveryType: resolved.deliveryConfig.deliveryType,
      connectionMode: resolved.deliveryConfig.connectionMode,
      authProfileId,
      authProfileName: authProfileSummary?.name,
      messageProfile: resolved.deliveryConfig.messageProfile,
      recipientProfile: resolved.deliveryConfig.recipientProfile,
      recipientCount: await this.getRecipientCount(app, resolved.resolved.deliveryType, resolved.resolved.userIds, resolved.resolved.departmentIds),
      maintenanceSnapshot: authProfileSummary?.maintenanceSnapshot,
      mcpPublished: resolved.deliveryConfig.mcpPublished === true,
      mcpDescription: resolved.deliveryConfig.mcpDescription,
      mcpTags: resolved.deliveryConfig.mcpTags ?? [],
      createdAt: app.createdAt,
      updatedAt: resolved.deliveryConfig.updatedAt ?? app.updatedAt,
    };
  }

  private async buildAuthProfileSummaryRecord(channel: Channel, usageCountOverride?: number): Promise<AuthProfileSummaryIndexRecord> {
    const masked = channelService.maskChannel(channel);
    const usageCount = usageCountOverride ?? await this.getUsageCount(channel.id);

    return {
      id: channel.id,
      name: channel.name,
      type: channel.type as Extract<DeliveryType, 'wechat' | 'work_wechat'>,
      config: masked.config as unknown as Record<string, unknown>,
      maintenanceSnapshot: await this.getMaintenanceSnapshot(channel),
      usageCount,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }

  private async resolveAuthProfileSummary(
    authProfileId: string,
    rawChannel?: Channel
  ): Promise<AuthProfileSummaryIndexRecord | null> {
    const indexed = await channelsKV.get<AuthProfileSummaryIndexRecord>(KVKeys.AUTH_PROFILE_SUMMARY(authProfileId));
    if (indexed && isAuthProfileSummaryRecord(indexed)) {
      return indexed;
    }

    if (rawChannel && isAuthProfileChannel(rawChannel)) {
      return this.buildAuthProfileSummaryRecord(rawChannel);
    }

    const channel = await channelService.getById(authProfileId);
    if (!isAuthProfileChannel(channel)) {
      return null;
    }

    return this.buildAuthProfileSummaryRecord(channel);
  }

  private async propagateAuthProfileSnapshot(summary: AuthProfileSummaryIndexRecord): Promise<void> {
    const appIds = await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_USAGE(summary.id));
    if (!appIds?.length) {
      return;
    }

    const appSummaryMap = await appsKV.getMany<AppSummaryIndexRecord>(appIds.map((id) => KVKeys.APP_SUMMARY(id)));
    await Promise.all(appIds.map(async (appId) => {
      const appSummary = appSummaryMap[KVKeys.APP_SUMMARY(appId)];
      if (!appSummary || !isAppSummaryRecord(appSummary)) {
        return;
      }

      await appsKV.put(KVKeys.APP_SUMMARY(appId), {
        ...appSummary,
        authProfileName: summary.name,
        maintenanceSnapshot: summary.maintenanceSnapshot,
      });
    }));
  }

  private async getExactAppSummaryRecord(appId: string): Promise<AppSummaryIndexRecord | null> {
    const direct = await this.readAppSummaryRecord(appId);
    if (direct) {
      return direct;
    }

    if (await this.shouldAttemptRepair('apps')) {
      try {
        await this.repairDomain('apps', 'auto');
      } catch {
        return null;
      }
    }

    return this.readAppSummaryRecord(appId);
  }

  private async getExactAuthProfileSummaryRecord(
    id: string,
    options?: { refreshMaintenance?: boolean }
  ): Promise<AuthProfileSummaryIndexRecord | null> {
    let summary = await this.readAuthProfileSummaryRecord(id);

    if (!summary && await this.shouldAttemptRepair('auth_profiles')) {
      try {
        await this.repairDomain('auth_profiles', 'auto');
      } catch {
        return null;
      }
      summary = await this.readAuthProfileSummaryRecord(id);
    }

    if (!summary || !options?.refreshMaintenance || !shouldRefreshMaintenance(summary.maintenanceSnapshot)) {
      return summary;
    }

    const channel = await channelService.getById(id);
    if (!isAuthProfileChannel(channel)) {
      return summary;
    }

    if (channel.type === 'wechat') {
      await wechatService.ensureTokenMaintenance(channel);
    } else {
      await workWeChatMaintenanceService.ensureTokenMaintenance(channel);
    }

    await this.syncAuthProfile(channel);
    return this.readAuthProfileSummaryRecord(id);
  }

  private async readAppSummaryRecord(appId: string): Promise<AppSummaryIndexRecord | null> {
    const summary = await appsKV.get<AppSummaryIndexRecord>(KVKeys.APP_SUMMARY(appId));
    if (!isAppSummaryRecord(summary)) {
      return null;
    }

    return summary;
  }

  private async readAuthProfileSummaryRecord(id: string): Promise<AuthProfileSummaryIndexRecord | null> {
    const summary = await channelsKV.get<AuthProfileSummaryIndexRecord>(KVKeys.AUTH_PROFILE_SUMMARY(id));
    if (!isAuthProfileSummaryRecord(summary)) {
      return null;
    }

    return summary;
  }

  private async shouldAttemptRepair(domain: RepairDomain): Promise<boolean> {
    const targetKV = domain === 'apps' ? appsKV : channelsKV;
    const failureKey = domain === 'apps' ? KVKeys.APP_REPAIR_FAILURE : KVKeys.AUTH_PROFILE_REPAIR_FAILURE;
    const failure = await targetKV.get<RepairFailureRecord>(failureKey);
    return !failure;
  }

  private async rebuildAppMeta(options: { source: RepairSource }): Promise<void> {
    const ids = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    const summaryMap = await appsKV.getMany<AppSummaryIndexRecord>(ids.map((id) => KVKeys.APP_SUMMARY(id)));
    const summaries = ids
      .map((id) => summaryMap[KVKeys.APP_SUMMARY(id)] ?? null)
      .filter((item): item is AppSummaryIndexRecord => isAppSummaryRecord(item));

    await appsKV.put(KVKeys.APP_META, this.buildAppMeta(summaries, options));
  }

  private async rebuildAuthProfileMeta(options: { source: RepairSource }): Promise<void> {
    const ids = (await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_LIST)) || [];
    const summaryMap = await channelsKV.getMany<AuthProfileSummaryIndexRecord>(ids.map((id) => KVKeys.AUTH_PROFILE_SUMMARY(id)));
    const summaries = ids
      .map((id) => summaryMap[KVKeys.AUTH_PROFILE_SUMMARY(id)] ?? null)
      .filter((item): item is AuthProfileSummaryIndexRecord => isAuthProfileSummaryRecord(item));

    await channelsKV.put(KVKeys.AUTH_PROFILE_META, this.buildAuthProfileMeta(summaries, options));
  }

  private buildAppMeta(summaries: AppSummaryIndexRecord[], options: { source: RepairSource }): AppCollectionMeta {
    const countsByDeliveryType: Partial<Record<DeliveryType, number>> = {};
    let totalRecipients = 0;

    for (const summary of summaries) {
      countsByDeliveryType[summary.deliveryType] = (countsByDeliveryType[summary.deliveryType] ?? 0) + 1;
      totalRecipients += summary.recipientCount;
    }

    const timestamp = now();
    return {
      version: APP_INDEX_VERSION,
      total: summaries.length,
      summaryCount: summaries.length,
      totalRecipients,
      countsByDeliveryType,
      updatedAt: timestamp,
      ...(options.source === 'auto' || options.source === 'manual'
        ? { lastRepairAt: timestamp }
        : {}),
    };
  }

  private buildAuthProfileMeta(
    summaries: AuthProfileSummaryIndexRecord[],
    options: { source: RepairSource }
  ): AuthProfileCollectionMeta {
    const countsByType: Partial<Record<Extract<DeliveryType, 'wechat' | 'work_wechat'>, number>> = {};
    for (const summary of summaries) {
      countsByType[summary.type] = (countsByType[summary.type] ?? 0) + 1;
    }

    const timestamp = now();
    return {
      version: AUTH_PROFILE_INDEX_VERSION,
      total: summaries.length,
      summaryCount: summaries.length,
      countsByType,
      updatedAt: timestamp,
      ...(options.source === 'auto' || options.source === 'manual'
        ? { lastRepairAt: timestamp }
        : {}),
    };
  }

  private toIndexStatus(
    meta: AppCollectionMeta | AuthProfileCollectionMeta | null,
    listCount: number,
    expectedVersion: number
  ): IndexCollectionStatus {
    return {
      version: meta?.version ?? 0,
      total: meta?.total ?? listCount,
      summaryCount: meta?.summaryCount ?? 0,
      healthy: Boolean(meta && meta.version === expectedVersion && meta.summaryCount === listCount),
      updatedAt: meta?.updatedAt,
      lastRepairAt: meta?.lastRepairAt,
    };
  }

  private mapAppSummary(summary: AppSummaryIndexRecord, baseUrl: string): ManagedAppSummary {
    return {
      ...summary,
      mcpPublished: summary.mcpPublished === true,
      mcpTags: summary.mcpTags ?? [],
      sendUrl: buildSendUrl(baseUrl, summary.key),
    };
  }

  private async getMaintenanceSnapshot(channel: Channel): Promise<AuthProfileMaintenanceStatus> {
    const rawStatus = channel.type === 'wechat'
      ? await wechatService.getTokenStatus(channel.id)
      : await workWeChatMaintenanceService.getTokenStatus(channel.id);

    return normalizeAuthProfileMaintenanceStatus(rawStatus);
  }

  private async getUsageCount(profileId: string): Promise<number> {
    const appIds = await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_USAGE(profileId));
    return appIds?.length ?? 0;
  }

  private async ensureAppListMembership(appId: string): Promise<void> {
    const ids = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    if (ids.includes(appId)) {
      return;
    }

    await appsKV.put(KVKeys.APP_LIST, [...ids, appId]);
  }

  private async removeAppListMembership(appId: string): Promise<void> {
    const ids = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    if (!ids.includes(appId)) {
      return;
    }

    await appsKV.put(KVKeys.APP_LIST, ids.filter((id) => id !== appId));
  }

  private async ensureAuthProfileListMembership(profileId: string): Promise<void> {
    const ids = (await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_LIST)) || [];
    if (ids.includes(profileId)) {
      return;
    }

    await channelsKV.put(KVKeys.AUTH_PROFILE_LIST, [...ids, profileId]);
  }

  private async addUsage(profileId: string, appId: string): Promise<void> {
    const ids = (await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_USAGE(profileId))) || [];
    if (ids.includes(appId)) {
      return;
    }

    await channelsKV.put(KVKeys.AUTH_PROFILE_USAGE(profileId), [...ids, appId]);
  }

  private async removeUsage(profileId: string, appId: string): Promise<void> {
    const ids = await channelsKV.get<string[]>(KVKeys.AUTH_PROFILE_USAGE(profileId));
    if (!ids?.includes(appId)) {
      return;
    }

    const nextIds = ids.filter((id) => id !== appId);
    if (nextIds.length === 0) {
      await channelsKV.delete(KVKeys.AUTH_PROFILE_USAGE(profileId));
      return;
    }

    await channelsKV.put(KVKeys.AUTH_PROFILE_USAGE(profileId), nextIds);
  }

  private buildUsageMap(summaries: AppSummaryIndexRecord[]): Map<string, string[]> {
    const usageMap = new Map<string, string[]>();

    for (const summary of summaries) {
      if (!summary.authProfileId) {
        continue;
      }

      const current = usageMap.get(summary.authProfileId) || [];
      current.push(summary.id);
      usageMap.set(summary.authProfileId, current);
    }

    return usageMap;
  }

  private async rebuildUsageIndexFromApps(): Promise<Map<string, string[]>> {
    const appIds = (await appsKV.get<string[]>(KVKeys.APP_LIST)) || [];
    if (appIds.length === 0) {
      return new Map();
    }

    const summaryMap = await appsKV.getMany<AppSummaryIndexRecord>(appIds.map((id) => KVKeys.APP_SUMMARY(id)));
    let summaries = appIds
      .map((id) => summaryMap[KVKeys.APP_SUMMARY(id)] ?? null)
      .filter((item): item is AppSummaryIndexRecord => isAppSummaryRecord(item));

    if (summaries.length !== appIds.length) {
      const appMap = await appsKV.getMany<App>(appIds.map((id) => KVKeys.APP(id)));
      const apps = appIds
        .map((id) => appMap[KVKeys.APP(id)] ?? null)
        .filter((item): item is App => item !== null);
      summaries = await Promise.all(apps.map((app) => this.buildAppSummaryRecord(app)));
    }

    return this.buildUsageMap(summaries);
  }

  private async writeUsageList(profileId: string, appIds: string[]): Promise<void> {
    if (appIds.length === 0) {
      await channelsKV.delete(KVKeys.AUTH_PROFILE_USAGE(profileId));
      return;
    }

    await channelsKV.put(KVKeys.AUTH_PROFILE_USAGE(profileId), appIds);
  }

  private async getRecipientCount(
    app: App,
    deliveryType: DeliveryType,
    userIds?: string[],
    departmentIds?: string[]
  ): Promise<number> {
    if (deliveryType === 'wechat') {
      const ids = await openidsKV.get<string[]>(KVKeys.OPENID_APP(app.id));
      return ids?.length ?? 0;
    }

    if (deliveryType === 'work_wechat') {
      return (userIds?.length ?? 0) + (departmentIds?.length ?? 0);
    }

    return 0;
  }
}

export const adminIndexService = new AdminIndexService();
