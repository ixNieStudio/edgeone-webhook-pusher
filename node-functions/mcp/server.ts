import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod/v4';
import { appService } from '../services/app.service.js';
import { appOrchestratorService } from '../services/app-orchestrator.service.js';
import { messageService } from '../services/message.service.js';
import { pushService } from '../services/push.service.js';
import { adminIndexService } from '../services/admin-index.service.js';
import { appsKV } from '../shared/kv-client.js';
import type { DeliveryResult } from '../types/index.js';
import { ApiError } from '../types/api.js';
import { KVKeys } from '../types/constants.js';
import { mcpLogger } from './logger.js';
import { mcpPublicAppService } from './public-app.service.js';

const MCP_SERVER_VERSION = '2.4.0';
const QUICKSTART_URI = 'edgeone://guide/quickstart';
const STATS_OVERVIEW_URI = 'edgeone://stats/overview';

const SEND_MESSAGE_SCHEMA = z.object({
  appKey: z.string().describe('Target app key copied from the admin Apps page or the /send/{appKey} URL.'),
  title: z.string().min(1).describe('Message title.'),
  body: z.string().optional().describe('Message body. Required when sendType=page.'),
  format: z.enum(['text', 'markdown', 'html']).optional().describe('Body format. Default text.'),
  sendType: z.enum(['text', 'page']).optional().describe('Use page to generate a hosted detail page.'),
  linkUrl: z.url().optional().describe('Optional jump URL.'),
  summary: z.string().optional().describe('Optional summary override.'),
  templateKey: z.string().optional().describe('Optional template profile key.'),
}).superRefine((value, ctx) => {
  if (value.sendType === 'page' && !value.body?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['body'],
      message: 'body is required when sendType=page',
    });
  }
});

const APP_SUMMARY_SCHEMA = z.object({
  appId: z.string(),
  appKey: z.string(),
  name: z.string(),
  description: z.string().optional(),
  deliveryType: z.enum(['wechat', 'work_wechat', 'dingtalk', 'feishu']),
  tags: z.array(z.string()),
  supports: z.object({
    sendTypes: z.array(z.enum(['text', 'page'])),
    formats: z.array(z.enum(['text', 'markdown', 'html'])),
    templateKeys: z.array(z.string()),
  }),
});

const APP_DETAIL_SCHEMA = APP_SUMMARY_SCHEMA.extend({
  workflow: z.array(z.string()),
  minimalPayload: z.object({
    appKey: z.string(),
    title: z.string(),
    body: z.string().optional(),
    sendType: z.enum(['text', 'page']).optional(),
    format: z.enum(['text', 'markdown', 'html']).optional(),
    summary: z.string().optional(),
    templateKey: z.string().optional(),
  }),
});

const DELIVERY_RESULT_SCHEMA = z.object({
  openId: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  msgId: z.string().optional(),
});

const SEND_MESSAGE_RESULT_SCHEMA = z.object({
  pushId: z.string(),
  appKey: z.string(),
  appName: z.string(),
  total: z.number(),
  success: z.number(),
  failed: z.number(),
  results: z.array(DELIVERY_RESULT_SCHEMA),
});

const APPS_LIST_RESULT_SCHEMA = z.object({
  apps: z.array(APP_SUMMARY_SCHEMA),
});

const APP_GET_RESULT_SCHEMA = z.object({
  app: APP_DETAIL_SCHEMA,
});

const MESSAGE_DELIVERY_SUMMARY_SCHEMA = z.object({
  total: z.number(),
  success: z.number(),
  failed: z.number(),
  state: z.enum(['received', 'success', 'partial', 'failed']),
});

const MESSAGE_FILTER_APP_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
});

const MESSAGE_LIST_ITEM_SCHEMA = z.object({
  id: z.string(),
  direction: z.enum(['outbound', 'inbound']),
  type: z.enum(['push', 'text', 'event']),
  channelId: z.string(),
  appId: z.string().optional(),
  appName: z.string().optional(),
  openId: z.string().optional(),
  title: z.string(),
  previewText: z.string(),
  contentFormat: z.enum(['text', 'markdown', 'html']).optional(),
  originalUrl: z.string().optional(),
  detailPageUrl: z.string().optional(),
  jumpMode: z.enum(['direct', 'landing', 'none']).optional(),
  event: z.string().optional(),
  createdAt: z.string(),
  delivery: MESSAGE_DELIVERY_SUMMARY_SCHEMA,
});

const MESSAGE_WORKSPACE_RESPONSE_SCHEMA = z.object({
  items: z.array(MESSAGE_LIST_ITEM_SCHEMA),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
  stats: z.object({
    total: z.number(),
    recent24h: z.number(),
    success: z.number(),
    failed: z.number(),
  }),
  filters: z.object({
    apps: z.array(MESSAGE_FILTER_APP_SCHEMA),
  }),
});

const MESSAGE_DETAIL_SCHEMA = z.object({
  id: z.string(),
  direction: z.enum(['outbound', 'inbound']),
  type: z.enum(['push', 'text', 'event']),
  channelId: z.string(),
  appId: z.string().optional(),
  appName: z.string().optional(),
  openId: z.string().optional(),
  userNickname: z.string().optional(),
  userAvatar: z.string().optional(),
  title: z.string(),
  desp: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  contentFormat: z.enum(['text', 'markdown', 'html']).optional(),
  originalUrl: z.string().optional(),
  detailPageToken: z.string().optional(),
  detailPageUrl: z.string().optional(),
  jumpMode: z.enum(['direct', 'landing', 'none']).optional(),
  templateProfileKey: z.string().optional(),
  event: z.string().optional(),
  results: z.array(DELIVERY_RESULT_SCHEMA).optional(),
  createdAt: z.string(),
  delivery: MESSAGE_DELIVERY_SUMMARY_SCHEMA,
  previewText: z.string(),
});

const STATS_RESULT_SCHEMA = z.object({
  channels: z.number(),
  apps: z.number(),
  openIds: z.number(),
  messages: z.number(),
});

const INDEX_COLLECTION_STATUS_SCHEMA = z.object({
  version: z.number(),
  total: z.number(),
  summaryCount: z.number(),
  healthy: z.boolean(),
  updatedAt: z.string().optional(),
  lastRepairAt: z.string().optional(),
});

const SETUP_OVERVIEW_SCHEMA = z.object({
  initialized: z.boolean(),
  stats: z.object({
    apps: z.number(),
    authProfiles: z.number(),
    messages: z.number(),
    recipients: z.number(),
  }),
  onboarding: z.array(z.object({
    key: z.string(),
    title: z.string(),
    completed: z.boolean(),
    description: z.string(),
  })),
  indexes: z.object({
    apps: INDEX_COLLECTION_STATUS_SCHEMA,
    authProfiles: INDEX_COLLECTION_STATUS_SCHEMA,
  }),
});

function buildInstructions(authInfo?: AuthInfo) {
  const lines = authInfo
    ? [
        'Workflow:',
        '1. Call apps_list to inspect available apps and appKeys, or use a known appKey directly.',
        '2. Call apps_get when you need exact supported fields for one app.',
        '3. Call send_message with appKey and title. send_message does not require a bearer token once you already have the appKey.',
        '4. Call messages_list, messages_get, stats_get, or setup_overview_get only for authenticated admin reads.',
        'Copy appKey from the admin Apps page or from the existing /send/{appKey} URL.',
        'If sendType is "page", body is required.',
      ]
    : [
        'Workflow:',
        '1. Anonymous sessions can call send_message only.',
        '2. Use a known appKey copied from the admin Apps page or from the existing /send/{appKey} URL.',
        '3. Reconnect with Authorization: Bearer <AT_...> when you need apps_list, apps_get, message history, stats, or setup tools.',
        'If sendType is "page", body is required.',
      ];

  return lines.join('\n');
}

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function toToolContent(value: unknown): CallToolResult['content'] {
  return [
    {
      type: 'text' as const,
      text: jsonText(value),
    },
  ];
}

function toStructuredContent(value: unknown): Record<string, unknown> {
  const normalized = JSON.parse(JSON.stringify(value)) as unknown;
  if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
    return normalized as Record<string, unknown>;
  }

  return {
    value: normalized,
  };
}

function hasAdminRead(authInfo?: AuthInfo) {
  return Boolean(authInfo);
}

async function resolveSendableApp(appKey: string) {
  const app = await appService.getByKey(appKey);
  if (!app) {
    throw ApiError.notFound('App not found');
  }

  return app;
}

export function createEdgeOneMcpServer(options: {
  baseUrl: string;
  authInfo?: AuthInfo;
}) {
  const server = new McpServer({
    name: 'edgeone-mcp-pusher',
    title: 'EdgeOne MCP Pusher',
    version: MCP_SERVER_VERSION,
  }, {
    capabilities: {
      logging: {},
    },
    instructions: buildInstructions(options.authInfo),
  });

  server.registerTool('send_message', {
    title: 'Send Message',
    description: 'Send a message to one app. Requires a known appKey copied from the admin Apps page or the /send/{appKey} URL. No bearer token is required for this tool.',
    inputSchema: SEND_MESSAGE_SCHEMA,
    outputSchema: SEND_MESSAGE_RESULT_SCHEMA,
    annotations: {
      title: 'Send Message',
      idempotentHint: false,
    },
  }, async (input, extra) => {
    const app = await resolveSendableApp(input.appKey);
    const result = await pushService.push(input.appKey, {
      title: input.title.trim(),
      desp: input.body?.trim(),
      content: input.body?.trim(),
      format: input.format,
      type: input.sendType,
      url: input.linkUrl,
      summary: input.summary?.trim(),
      template: input.templateKey?.trim(),
    }, {
      baseUrl: options.baseUrl,
    });

    const structuredContent = {
      pushId: result.pushId,
      appKey: input.appKey,
      appName: app.name,
      total: result.total,
      success: result.success,
      failed: result.failed,
      results: (result.results ?? []) as DeliveryResult[],
    };

    const content: CallToolResult['content'] = [...toToolContent(structuredContent)];
    if (hasAdminRead(extra.authInfo)) {
      content.push({
        type: 'resource_link',
        uri: `edgeone://messages/${result.pushId}`,
        name: `Message ${result.pushId}`,
        mimeType: 'application/json',
        description: 'Read this resource for the stored message detail view.',
      });
    }

    mcpLogger.info({
      tool: 'send_message',
      appKey: input.appKey,
      pushId: result.pushId,
      authClientId: extra.authInfo?.clientId,
    }, 'Sent MCP message');

    return {
      content,
      structuredContent: toStructuredContent(structuredContent),
    };
  });

  if (hasAdminRead(options.authInfo)) {
    server.registerTool('apps_list', {
      title: 'List Apps',
      description: 'List available apps and their appKeys. Requires authenticated access.',
      outputSchema: APPS_LIST_RESULT_SCHEMA,
      annotations: {
        title: 'List Apps',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    }, async () => {
      const apps = await mcpPublicAppService.list();
      const structuredContent = { apps };
      mcpLogger.info({ tool: 'apps_list', count: apps.length }, 'Listed MCP apps');

      return {
        content: toToolContent(structuredContent),
        structuredContent: toStructuredContent(structuredContent),
      };
    });

    server.registerTool('apps_get', {
      title: 'Get App',
      description: 'Get one app by appKey. Requires authenticated access.',
      inputSchema: {
        appKey: z.string().describe('A target appKey returned by apps_list.'),
      },
      outputSchema: APP_GET_RESULT_SCHEMA,
      annotations: {
        title: 'Get App',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    }, async ({ appKey }) => {
      const app = await mcpPublicAppService.getByAppKey(appKey);
      if (!app) {
        throw ApiError.notFound('App not found');
      }

      const structuredContent = { app };
      return {
        content: toToolContent(structuredContent),
        structuredContent: toStructuredContent(structuredContent),
      };
    });

    server.registerResource('quickstart', QUICKSTART_URI, {
      title: 'Quickstart Guide',
      description: 'Minimal workflow for authenticated app discovery and message sending.',
      mimeType: 'text/plain',
    }, async () => ({
      contents: [
        {
          uri: QUICKSTART_URI,
          mimeType: 'text/plain',
          text: [
            '1. Authenticate with Authorization: Bearer <AT_...>.',
            '2. Call apps_list to inspect apps and appKeys.',
            '3. Optionally call apps_get for one app.',
            '4. Call send_message with appKey and title.',
            'If sendType is "page", body is required.',
          ].join('\n'),
        },
      ],
    }));

    server.registerPrompt('choose_app_and_send', {
      title: 'Choose App And Send',
      description: 'Inspect apps with authenticated tools, then prepare a send_message call.',
      argsSchema: {
        goal: z.string().optional().describe('What the user wants to notify about.'),
      },
    }, async ({ goal }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Authenticate first, then call apps_list.',
              'Choose the best app for the user request.',
              'If needed, call apps_get before send_message.',
              goal ? `Notification goal: ${goal}` : 'Then call send_message with the selected appKey.',
            ].join('\n'),
          },
        },
      ],
    }));

    server.registerTool('messages_list', {
      title: 'List Messages',
      description: 'List stored messages with pagination and filters. Requires authenticated access.',
      inputSchema: {
        page: z.number().int().min(1).optional().describe('Page number, default 1.'),
        pageSize: z.number().int().min(1).max(100).optional().describe('Page size, default 20.'),
        appId: z.string().optional().describe('Optional app ID filter.'),
        direction: z.enum(['inbound', 'outbound']).optional().describe('Optional direction filter.'),
        startDate: z.string().optional().describe('Optional ISO start date.'),
        endDate: z.string().optional().describe('Optional ISO end date.'),
      },
      outputSchema: MESSAGE_WORKSPACE_RESPONSE_SCHEMA,
      annotations: {
        title: 'List Messages',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    }, async ({ page, pageSize, appId, direction, startDate, endDate }) => {
      const data = await messageService.listSummaries({
        page,
        pageSize,
        appId,
        direction,
        startDate,
        endDate,
      }, options.baseUrl);

      return {
        content: toToolContent(data),
        structuredContent: toStructuredContent(data),
      };
    });

    server.registerTool('messages_get', {
      title: 'Get Message',
      description: 'Get one stored message detail. Requires authenticated access.',
      inputSchema: {
        messageId: z.string().describe('Message ID or pushId.'),
      },
      outputSchema: MESSAGE_DETAIL_SCHEMA,
      annotations: {
        title: 'Get Message',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    }, async ({ messageId }) => {
      const detail = await messageService.getDetail(messageId, options.baseUrl);
      if (!detail) {
        throw ApiError.notFound('Message not found');
      }

      return {
        content: toToolContent(detail),
        structuredContent: toStructuredContent(detail),
      };
    });

    server.registerTool('stats_get', {
      title: 'Get Stats',
      description: 'Get system overview statistics. Requires authenticated access.',
      outputSchema: STATS_RESULT_SCHEMA,
      annotations: {
        title: 'Get Stats',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    }, async () => {
      const [indexStatus, totalMessages, appMeta] = await Promise.all([
        adminIndexService.getIndexStatus(),
        messageService.getTotalCount(),
        appsKV.get<{ totalRecipients?: number }>(KVKeys.APP_META),
      ]);
      const data = {
        channels: indexStatus.authProfiles.total,
        apps: indexStatus.apps.total,
        openIds: appMeta?.totalRecipients ?? 0,
        messages: totalMessages,
      };

      return {
        content: toToolContent(data),
        structuredContent: toStructuredContent(data),
      };
    });

    server.registerTool('setup_overview_get', {
      title: 'Get Setup Overview',
      description: 'Get setup overview and onboarding status. Requires authenticated access.',
      outputSchema: SETUP_OVERVIEW_SCHEMA,
      annotations: {
        title: 'Get Setup Overview',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    }, async () => {
      const data = await appOrchestratorService.getSetupOverview();
      return {
        content: toToolContent(data),
        structuredContent: toStructuredContent(data),
      };
    });

    server.registerResource('stats-overview', STATS_OVERVIEW_URI, {
      title: 'Stats Overview',
      description: 'System overview statistics for authenticated sessions.',
      mimeType: 'application/json',
    }, async () => {
      const [indexStatus, totalMessages, appMeta] = await Promise.all([
        adminIndexService.getIndexStatus(),
        messageService.getTotalCount(),
        appsKV.get<{ totalRecipients?: number }>(KVKeys.APP_META),
      ]);

      const payload = {
        channels: indexStatus.authProfiles.total,
        apps: indexStatus.apps.total,
        openIds: appMeta?.totalRecipients ?? 0,
        messages: totalMessages,
      };

      return {
        contents: [
          {
            uri: STATS_OVERVIEW_URI,
            mimeType: 'application/json',
            text: jsonText(payload),
          },
        ],
      };
    });

    server.registerResource('message-detail', new ResourceTemplate('edgeone://messages/{messageId}', {
      list: undefined,
    }), {
      title: 'Message Detail',
      description: 'Read one stored message detail by message ID.',
      mimeType: 'application/json',
    }, async (_uri, variables) => {
      const messageId = String(variables.messageId ?? '');
      const detail = await messageService.getDetail(messageId, options.baseUrl);
      if (!detail) {
        throw ApiError.notFound('Message not found');
      }

      return {
        contents: [
          {
            uri: `edgeone://messages/${messageId}`,
            mimeType: 'application/json',
            text: jsonText(detail),
          },
        ],
      };
    });

    server.registerPrompt('summarize_recent_messages', {
      title: 'Summarize Recent Messages',
      description: 'Summarize recent delivery activity using authenticated message history tools.',
      argsSchema: {
        limit: z.number().int().min(1).max(20).optional().describe('How many recent messages to summarize.'),
      },
    }, async ({ limit = 10 }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Call messages_list first.',
              `Inspect up to ${limit} recent messages.`,
              'Summarize delivery health, failures, and notable patterns.',
            ].join('\n'),
          },
        },
      ],
    }));
  }

  return server;
}
