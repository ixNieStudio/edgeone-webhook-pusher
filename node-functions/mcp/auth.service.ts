import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { configService } from '../services/config.service.js';

export class McpAuthError extends Error {
  constructor(
    public error: string,
    description: string,
    public status = 400
  ) {
    super(description);
    this.name = 'McpAuthError';
  }

  toJSON() {
    return {
      error: this.error,
      error_description: this.message,
    };
  }
}

class McpAuthService {
  async authenticateBearerToken(token: string): Promise<AuthInfo> {
    const config = await configService.getConfig();
    if (!config?.adminToken || config.adminToken !== token) {
      throw new McpAuthError('invalid_token', 'Bearer token is invalid.', 401);
    }

    return {
      token,
      clientId: 'admin-token',
      scopes: ['admin'],
      extra: {
        authMode: 'admin_token',
      },
    };
  }
}

export const mcpAuthService = new McpAuthService();
