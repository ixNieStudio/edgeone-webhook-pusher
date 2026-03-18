import { appService } from '../services/app.service.js';
import { appConfigService } from '../services/app-config.service.js';
import type { App, DeliveryType } from '../types/index.js';

export interface McpAppSupportInfo {
  sendTypes: Array<'text' | 'page'>;
  formats: Array<'text' | 'markdown' | 'html'>;
  templateKeys: string[];
}

export interface McpPublicAppSummary {
  appId: string;
  appKey: string;
  name: string;
  description?: string;
  deliveryType: DeliveryType;
  tags: string[];
  supports: McpAppSupportInfo;
}

export interface McpPublicAppDetail extends McpPublicAppSummary {
  workflow: string[];
  minimalPayload: {
    appKey: string;
    title: string;
    body?: string;
    sendType?: 'text' | 'page';
    format?: 'text' | 'markdown' | 'html';
    summary?: string;
    templateKey?: string;
  };
}

function buildSupportInfo(app: App, templateKeys: string[]): McpAppSupportInfo {
  if (app.channelType === 'wechat' || app.channelType === 'work_wechat') {
    return {
      sendTypes: ['text', 'page'],
      formats: ['text'],
      templateKeys,
    };
  }

  return {
    sendTypes: ['text'],
    formats: ['text', 'markdown', 'html'],
    templateKeys,
  };
}

function buildMinimalPayload(
  appKey: string,
  deliveryType: DeliveryType,
  templateKeys: string[]
): McpPublicAppDetail['minimalPayload'] {
  if (deliveryType === 'wechat' || deliveryType === 'work_wechat') {
    return {
      appKey,
      title: 'Server Alert',
      body: 'CPU usage exceeded 80%',
      sendType: 'text',
    };
  }

  return {
    appKey,
    title: 'Server Alert',
    body: 'CPU usage exceeded 80%',
    format: 'markdown',
    ...(templateKeys[0] ? { templateKey: templateKeys[0] } : {}),
  };
}

class McpPublicAppService {
  private async mapCatalogApp(app: App): Promise<McpPublicAppDetail> {
    const resolved = await appConfigService.resolveApp(app);
    const templateKeys = (resolved.deliveryConfig.messageProfile.templateProfiles ?? [])
      .filter((profile) => profile.enabled !== false)
      .map((profile) => profile.key);
    const supports = buildSupportInfo(app, templateKeys);

    return {
      appId: app.id,
      appKey: app.key,
      name: app.name,
      description: resolved.deliveryConfig.mcpDescription,
      deliveryType: resolved.deliveryConfig.deliveryType,
      tags: resolved.deliveryConfig.mcpTags ?? [],
      supports,
      workflow: [
        'Authenticate with Authorization: Bearer <AT_...> before calling apps_list.',
        'Call apps_list to discover appKeys.',
        'Optionally call apps_get for supported fields.',
        'Call send_message with appKey and title.',
      ],
      minimalPayload: buildMinimalPayload(app.key, resolved.deliveryConfig.deliveryType, templateKeys),
    };
  }

  async list(): Promise<McpPublicAppSummary[]> {
    const apps = await appService.list();
    const catalog = (await Promise.all(apps.map((app) => this.mapCatalogApp(app))))
      .sort((left, right) => left.name.localeCompare(right.name));

    return catalog.map(({ workflow, minimalPayload, ...summary }) => summary);
  }

  async getByAppKey(appKey: string): Promise<McpPublicAppDetail | null> {
    const app = await appService.getByKey(appKey);
    if (!app) {
      return null;
    }

    return this.mapCatalogApp(app);
  }
}

export const mcpPublicAppService = new McpPublicAppService();
