import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from '../../types/app.js';
import type { AppCollectionMeta, AppSummaryIndexRecord } from '../../types/app-config.js';
import { KVKeys } from '../../types/constants.js';

vi.mock('../../shared/kv-client.js', () => ({
  appsKV: {
    get: vi.fn(),
    getMany: vi.fn(),
    put: vi.fn(),
    putMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    listAll: vi.fn(),
  },
  channelsKV: {
    get: vi.fn(),
    getMany: vi.fn(),
    put: vi.fn(),
    putMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    listAll: vi.fn(),
  },
  openidsKV: {
    get: vi.fn(),
  },
}));

vi.mock('../../shared/utils.js', () => ({
  now: vi.fn(() => '2026-03-17T10:00:00.000Z'),
}));

vi.mock('../app-config.service.js', () => ({
  appConfigService: {
    resolveApp: vi.fn(),
  },
}));

vi.mock('../channel.service.js', () => ({
  channelService: {
    getById: vi.fn(),
    maskChannel: vi.fn((channel: { config: unknown }) => channel),
  },
}));

vi.mock('../wechat.service.js', () => ({
  wechatService: {
    getTokenStatus: vi.fn(),
    ensureTokenMaintenance: vi.fn(),
  },
}));

vi.mock('../work-wechat-maintenance.service.js', () => ({
  workWeChatMaintenanceService: {
    getTokenStatus: vi.fn(),
    ensureTokenMaintenance: vi.fn(),
  },
}));

import { appsKV, channelsKV, openidsKV } from '../../shared/kv-client.js';
import { appConfigService } from '../app-config.service.js';
import { adminIndexService } from '../admin-index.service.js';

const mockAppsKV = vi.mocked(appsKV);
const mockChannelsKV = vi.mocked(channelsKV);
const mockOpenidsKV = vi.mocked(openidsKV);
const mockAppConfigService = vi.mocked(appConfigService);

describe('AdminIndexService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppsKV.put.mockResolvedValue(undefined);
    mockAppsKV.putMany.mockResolvedValue(undefined);
    mockAppsKV.delete.mockResolvedValue(undefined);
    mockAppsKV.deleteMany.mockResolvedValue(undefined);
    mockChannelsKV.put.mockResolvedValue(undefined);
    mockChannelsKV.putMany.mockResolvedValue(undefined);
    mockChannelsKV.delete.mockResolvedValue(undefined);
    mockChannelsKV.deleteMany.mockResolvedValue(undefined);
    mockOpenidsKV.get.mockResolvedValue(null);
  });

  it('reads app summaries from exact keys without scanning when index is healthy', async () => {
    const summary: AppSummaryIndexRecord = {
      id: 'app_1',
      key: 'APK_xxx',
      name: 'Test App',
      deliveryType: 'dingtalk',
      connectionMode: 'inline_webhook',
      messageProfile: { renderer: 'text' },
      recipientProfile: { mode: 'none' },
      recipientCount: 0,
      createdAt: '2026-03-17T10:00:00.000Z',
      updatedAt: '2026-03-17T10:00:00.000Z',
    };
    const meta: AppCollectionMeta = {
      version: 1,
      total: 1,
      summaryCount: 1,
      totalRecipients: 0,
      countsByDeliveryType: { dingtalk: 1 },
      updatedAt: '2026-03-17T10:00:00.000Z',
      lastRepairAt: '2026-03-17T10:00:00.000Z',
    };

    mockAppsKV.getMany.mockImplementation(async (keys: string[]) => {
      if (keys.includes(KVKeys.APP_LIST) || keys.includes(KVKeys.APP_META)) {
        return {
          [KVKeys.APP_LIST]: ['app_1'],
          [KVKeys.APP_META]: meta,
        };
      }

      return {
        [KVKeys.APP_SUMMARY('app_1')]: summary,
      };
    });

    const result = await adminIndexService.listAppSummaries('https://example.com');

    expect(result).toEqual([
      {
        ...summary,
        sendUrl: 'https://example.com/send/APK_xxx',
      },
    ]);
    expect(mockAppsKV.listAll).not.toHaveBeenCalled();
  });

  it('reads a single app summary by exact key without loading the whole collection', async () => {
    const summary: AppSummaryIndexRecord = {
      id: 'app_1',
      key: 'APK_xxx',
      name: 'Test App',
      deliveryType: 'dingtalk',
      connectionMode: 'inline_webhook',
      messageProfile: { renderer: 'text' },
      recipientProfile: { mode: 'none' },
      recipientCount: 0,
      createdAt: '2026-03-17T10:00:00.000Z',
      updatedAt: '2026-03-17T10:00:00.000Z',
    };

    mockAppsKV.get.mockImplementation(async (key: string) => {
      if (key === KVKeys.APP_SUMMARY('app_1')) return summary;
      return null;
    });

    const result = await adminIndexService.getAppSummaryById('app_1', 'https://example.com');

    expect(result).toEqual({
      ...summary,
      sendUrl: 'https://example.com/send/APK_xxx',
    });
    expect(mockAppsKV.getMany).not.toHaveBeenCalled();
    expect(mockAppsKV.listAll).not.toHaveBeenCalled();
  });

  it('repairs app summaries from legacy app_list without scanning app prefix', async () => {
    const app: App = {
      id: 'app_1',
      key: 'APK_xxx',
      name: 'Webhook App',
      channelId: 'inline:app_1',
      channelType: 'dingtalk',
      createdAt: '2026-03-17T10:00:00.000Z',
      updatedAt: '2026-03-17T10:00:00.000Z',
    };

    mockAppsKV.get.mockImplementation(async (key: string) => {
      if (key === KVKeys.APP_LIST) {
        return ['app_1'];
      }
      return null;
    });
    mockAppsKV.getMany.mockImplementation(async (keys: string[]) => {
      if (keys.includes(KVKeys.APP_LIST) || keys.includes(KVKeys.APP_META)) {
        return {
          [KVKeys.APP_LIST]: ['app_1'],
          [KVKeys.APP_META]: null,
        };
      }

      if (keys.includes(KVKeys.APP('app_1'))) {
        return {
          [KVKeys.APP('app_1')]: app,
        };
      }
      return {};
    });
    mockAppConfigService.resolveApp.mockResolvedValue({
      deliveryConfig: {
        appId: 'app_1',
        deliveryType: 'dingtalk',
        connectionMode: 'inline_webhook',
        inlineWebhook: {
          webhookUrl: 'https://example.com/hook',
        },
        messageProfile: { renderer: 'text' },
        recipientProfile: { mode: 'none' },
        createdAt: '2026-03-17T10:00:00.000Z',
        updatedAt: '2026-03-17T10:00:00.000Z',
      },
      resolved: {
        appId: 'app_1',
        appKey: 'APK_xxx',
        appName: 'Webhook App',
        deliveryType: 'dingtalk',
        runtimeChannelId: 'inline:app_1',
        renderer: 'text',
      },
      runtimeChannel: {
        id: 'inline:app_1',
        name: 'Webhook App',
        type: 'dingtalk',
        config: {
          webhookUrl: 'https://example.com/hook',
        },
        createdAt: '2026-03-17T10:00:00.000Z',
        updatedAt: '2026-03-17T10:00:00.000Z',
      },
      legacy: {
        usesLegacyChannel: false,
        usesInlineWebhookFallback: false,
      },
    } as Awaited<ReturnType<typeof appConfigService.resolveApp>>);

    await adminIndexService.repair('apps', 'manual');

    expect(mockAppsKV.listAll).not.toHaveBeenCalled();
    expect(mockAppsKV.putMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          key: KVKeys.APP_SUMMARY('app_1'),
          value: expect.objectContaining({
            id: 'app_1',
            key: 'APK_xxx',
            name: 'Webhook App',
          }),
        }),
      ])
    );
  });
});
