import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { extractRequestOrigin } from '../middleware/kv-base-url.js';
import { createMcpApp } from './app-factory.js';
import { mcpLogger } from './logger.js';
import { mcpAuthService, McpAuthError } from './auth.service.js';
import { createEdgeOneMcpServer } from './server.js';

const ADMIN_TOOL_NAMES = new Set([
  'apps_list',
  'apps_get',
  'messages_list',
  'messages_get',
  'stats_get',
  'setup_overview_get',
]);

const ADMIN_PROMPT_NAMES = new Set([
  'choose_app_and_send',
  'summarize_recent_messages',
]);

function writeJsonRpcError(
  ctx: Parameters<Parameters<typeof createMcpApp>[0]>[0],
  status: number,
  code: number,
  message: string
) {
  ctx.status = status;
  ctx.type = 'application/json';
  ctx.body = {
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id: null,
  };
}

function writeAuthChallenge(
  ctx: Parameters<Parameters<typeof createMcpApp>[0]>[0],
  error: McpAuthError
) {
  const challenge = [
    'Bearer realm="edgeone-mcp-pusher"',
    `error="${error.error}"`,
    `error_description="${error.message}"`,
  ];

  ctx.set('WWW-Authenticate', challenge.join(', '));
  ctx.status = error.status;
  ctx.type = 'application/json';
  ctx.body = error.toJSON();
}

function getParamsRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function requiresAdminRead(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }

  const request = body as {
    method?: string;
    params?: unknown;
  };
  const params = getParamsRecord(request.params);

  switch (request.method) {
    case 'tools/call':
      return typeof params?.name === 'string' && ADMIN_TOOL_NAMES.has(params.name);
    case 'prompts/get':
      return typeof params?.name === 'string' && ADMIN_PROMPT_NAMES.has(params.name);
    case 'resources/read': {
      const uri = typeof params?.uri === 'string' ? params.uri : '';
      return uri === 'edgeone://guide/quickstart'
        || uri === 'edgeone://stats/overview'
        || uri.startsWith('edgeone://messages/');
    }
    default:
      return false;
  }
}

async function resolveAuthInfo(authHeader: string | undefined): Promise<AuthInfo | undefined> {
  if (!authHeader) {
    return undefined;
  }

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new McpAuthError('invalid_token', "Invalid Authorization header format, expected 'Bearer TOKEN'", 401);
  }

  return mcpAuthService.authenticateBearerToken(token);
}

const app = createMcpApp(async (ctx) => {
  const baseUrl = extractRequestOrigin(ctx);

  if (ctx.method === 'GET' || ctx.method === 'DELETE') {
    writeJsonRpcError(ctx, 405, -32000, 'Method not allowed.');
    return;
  }

  if (ctx.method !== 'POST') {
    writeJsonRpcError(ctx, 405, -32000, 'Method not allowed.');
    return;
  }

  let authInfo: AuthInfo | undefined;
  try {
    authInfo = await resolveAuthInfo(ctx.get('authorization') || undefined);
  } catch (error) {
    if (error instanceof McpAuthError) {
      writeAuthChallenge(ctx, error);
      return;
    }

    throw error;
  }

  const body = ctx.request.body;
  if (Array.isArray(body)) {
    writeJsonRpcError(ctx, 400, -32600, 'JSON-RPC batch is not supported.');
    return;
  }

  const initializeRequest = isInitializeRequest(body);
  if (!initializeRequest && !ctx.get('mcp-protocol-version')) {
    writeJsonRpcError(ctx, 400, -32000, 'Bad Request: MCP-Protocol-Version header is required.');
    return;
  }

  if (requiresAdminRead(body) && !authInfo) {
    writeAuthChallenge(
      ctx,
      new McpAuthError('invalid_token', 'Authorization: Bearer <AT_...> is required for admin MCP tools.', 401)
    );
    return;
  }

  const server = createEdgeOneMcpServer({ baseUrl, authInfo });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    if (authInfo) {
      const requestWithAuth = ctx.req as typeof ctx.req & { auth?: AuthInfo };
      requestWithAuth.auth = authInfo;
    }

    if (initializeRequest) {
      mcpLogger.info({
        method: 'initialize',
        authClientId: authInfo?.clientId,
      }, 'Received MCP initialize request');
    }

    ctx.respond = false;
    ctx.res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await transport.handleRequest(ctx.req, ctx.res, body);
  } catch (error) {
    mcpLogger.error({
      err: error,
      authClientId: authInfo?.clientId,
    }, 'Failed to handle MCP request');

    if (!ctx.res.headersSent) {
      ctx.respond = false;
      ctx.res.statusCode = 500;
      ctx.res.setHeader('Content-Type', 'application/json');
      ctx.res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        id: null,
      }));
    }
  }
});

export default app;
