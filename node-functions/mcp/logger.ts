import pino from 'pino';

export const mcpLogger = pino({
  name: 'edgeone-mcp-pusher',
  level: process.env.MCP_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
});
