/**
 * OpenAPIBuilder - 组装 OpenAPI 规范
 */

import type {
  RouteInfo,
  OpenAPISpec,
  JSONSchema,
  Operation,
  Parameter,
} from './types.js';
import { inferTagFromFileName } from './route-scanner.js';

// API 基础信息
const API_INFO = {
  title: 'Webhook Pusher API',
  version: '2.0.0',
  description: `
Webhook Pusher 是一个基于 EdgeOne 的消息推送服务，支持通过 Webhook 发送微信公众号消息。

## 架构概述

系统采用三层架构：
- **Channel（渠道）**: 消息发送通道配置，如微信公众号
- **App（应用）**: 业务应用，关联渠道并定义推送模式
- **OpenID**: 应用下绑定的微信用户

## 认证方式

管理 API 需要在请求头中携带 Admin Token：
\`\`\`
Authorization: Bearer <admin_token>
\`\`\`
或
\`\`\`
X-Admin-Token: <admin_token>
\`\`\`

## Webhook 调用

Webhook API 无需认证，通过 App Key 标识应用：
\`\`\`
GET /{appKey}.send?title=消息标题&desp=消息内容
POST /{appKey}.send
\`\`\`
  `.trim(),
  contact: {
    name: 'ixNieStudio',
    email: 'colin@ixnie.cn',
  },
  license: {
    name: 'GPL-3.0',
    url: 'https://www.gnu.org/licenses/gpl-3.0.html',
  },
};

// 预定义的 tags
const TAGS = [
  { name: 'Webhook', description: 'Webhook 推送' },
  { name: 'Init', description: '系统初始化' },
  { name: 'Auth', description: '认证' },
  { name: 'Config', description: '系统配置' },
  { name: 'Channels', description: '渠道管理' },
  { name: 'Apps', description: '应用管理' },
  { name: 'OpenIDs', description: 'OpenID 管理' },
  { name: 'Messages', description: '消息历史' },
  { name: 'Stats', description: '统计数据' },
];

// 安全方案
const SECURITY_SCHEMES = {
  BearerAuth: {
    type: 'http',
    scheme: 'bearer',
    description: 'Admin Token 认证',
  },
  AdminToken: {
    type: 'apiKey',
    in: 'header',
    name: 'X-Admin-Token',
    description: 'Admin Token (alternative)',
  },
};

export class OpenAPIBuilder {
  private spec: OpenAPISpec;

  constructor() {
    this.spec = {
      openapi: '3.0.3',
      info: API_INFO,
      servers: [{ url: '/v1', description: 'API v1' }],
      tags: TAGS,
      paths: {},
      components: {
        schemas: {},
        securitySchemes: SECURITY_SCHEMES,
      },
    };
  }

  /**
   * 构建完整的 OpenAPI 规范
   */
  build(routes: RouteInfo[], schemas: Record<string, JSONSchema>): OpenAPISpec {
    // 添加 schemas
    for (const [name, schema] of Object.entries(schemas)) {
      this.addSchema(name, schema);
    }

    // 添加通用 schemas
    this.addCommonSchemas();

    // 添加路由
    for (const route of routes) {
      this.addPath(route);
    }

    // 添加 Webhook 路由（特殊处理）
    this.addWebhookPaths();

    return this.spec;
  }

  /**
   * 添加 Schema
   */
  addSchema(name: string, schema: JSONSchema): void {
    if (!this.spec.components) {
      this.spec.components = { schemas: {} };
    }
    if (!this.spec.components.schemas) {
      this.spec.components.schemas = {};
    }
    this.spec.components.schemas[name] = schema;
  }

  /**
   * 添加通用 Schemas
   */
  private addCommonSchemas(): void {
    this.addSchema('Error', {
      type: 'object',
      properties: {
        code: { type: 'integer', description: '错误码' },
        message: { type: 'string', description: '错误信息' },
        data: { type: 'object' },
      },
    });

    this.addSchema('Success', {
      type: 'object',
      properties: {
        code: { type: 'integer' },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    });

    this.addSchema('Pagination', {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        page: { type: 'integer' },
        pageSize: { type: 'integer' },
        totalPages: { type: 'integer' },
      },
    });
  }

  /**
   * 添加路由到 paths
   */
  addPath(route: RouteInfo): void {
    const pathKey = route.path;

    if (!this.spec.paths[pathKey]) {
      this.spec.paths[pathKey] = {};
    }

    // 提取路径参数
    const pathParams = this.extractPathParams(route.path);

    // 如果有路径参数且还没有定义，添加到 path 级别
    if (pathParams.length > 0 && !this.spec.paths[pathKey].parameters) {
      this.spec.paths[pathKey].parameters = pathParams;
    }

    // 构建 operation
    const operation = this.buildOperation(route);
    this.spec.paths[pathKey][route.method] = operation;
  }

  /**
   * 构建 Operation 对象
   */
  private buildOperation(route: RouteInfo): Operation {
    const tag = route.jsDoc?.tags?.[0] || inferTagFromFileName(route.sourceFile);
    const summary = route.jsDoc?.summary || this.generateSummary(route);
    const operationId = this.generateOperationId(route);

    const operation: Operation = {
      tags: [tag],
      summary,
      operationId,
      responses: this.buildResponses(route),
    };

    // 添加描述
    if (route.jsDoc?.description) {
      operation.description = route.jsDoc.description;
    }

    // 添加安全要求
    if (route.requiresAuth) {
      operation.security = [{ BearerAuth: [] }, { AdminToken: [] }];
    }

    // 添加查询参数
    const queryParams = this.buildQueryParams(route);
    if (queryParams.length > 0) {
      operation.parameters = queryParams;
    }

    // 添加请求体
    if (['post', 'put', 'patch'].includes(route.method)) {
      operation.requestBody = this.buildRequestBody(route);
    }

    return operation;
  }

  /**
   * 提取路径参数
   */
  private extractPathParams(path: string): Parameter[] {
    const params: Parameter[] = [];
    const paramPattern = /\{([^}]+)\}/g;
    let match: RegExpExecArray | null;

    while ((match = paramPattern.exec(path)) !== null) {
      params.push({
        name: match[1],
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: this.getParamDescription(match[1]),
      });
    }

    return params;
  }

  /**
   * 获取参数描述
   */
  private getParamDescription(paramName: string): string {
    const descriptions: Record<string, string> = {
      id: 'Resource ID',
      appId: '应用 ID',
      channelId: '渠道 ID',
      appKey: '应用 Key (APK...)',
    };
    return descriptions[paramName] || `${paramName} parameter`;
  }

  /**
   * 构建查询参数
   */
  private buildQueryParams(route: RouteInfo): Parameter[] {
    const params: Parameter[] = [];

    // 从 JSDoc 中提取查询参数
    if (route.jsDoc?.params) {
      for (const param of route.jsDoc.params) {
        if (param.in === 'query') {
          params.push({
            name: param.name,
            in: 'query',
            description: param.description,
            schema: { type: param.type || 'string' },
          });
        }
      }
    }

    // 为 messages 列表添加分页参数
    if (route.path === '/messages' && route.method === 'get') {
      params.push(
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: '页码' },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 }, description: '每页数量' },
        { name: 'appId', in: 'query', schema: { type: 'string' }, description: '按应用筛选' },
        { name: 'startDate', in: 'query', schema: { type: 'string' }, description: '开始日期' },
        { name: 'endDate', in: 'query', schema: { type: 'string' }, description: '结束日期' }
      );
    }

    return params;
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(route: RouteInfo): { required: boolean; content: Record<string, { schema: JSONSchema | { $ref: string } }> } {
    // 根据路由推断请求体 schema
    const schemaRef = this.inferRequestSchema(route);

    return {
      required: true,
      content: {
        'application/json': {
          schema: schemaRef ? { $ref: `#/components/schemas/${schemaRef}` } : { type: 'object' },
        },
      },
    };
  }

  /**
   * 推断请求体 Schema
   */
  private inferRequestSchema(route: RouteInfo): string | null {
    const pathParts = route.path.split('/').filter(Boolean);
    const resource = pathParts[0];

    // 特殊处理 reset-token 端点
    if (route.path === '/config/reset-token' && route.method === 'post') {
      return 'ResetTokenRequest';
    }

    if (route.method === 'post') {
      const schemaMap: Record<string, string> = {
        channels: 'CreateChannelInput',
        apps: 'CreateAppInput',
        openids: 'CreateOpenIDInput',
      };
      // 处理嵌套路由
      if (route.path.includes('/openids')) {
        return 'CreateOpenIDInput';
      }
      return schemaMap[resource] || null;
    }

    if (route.method === 'put') {
      const schemaMap: Record<string, string> = {
        channels: 'UpdateChannelInput',
        apps: 'UpdateAppInput',
        openids: 'UpdateOpenIDInput',
      };
      if (route.path.includes('/openids')) {
        return 'UpdateOpenIDInput';
      }
      return schemaMap[resource] || null;
    }

    return null;
  }

  /**
   * 构建响应
   */
  private buildResponses(route: RouteInfo): Record<string, { description: string; content?: Record<string, { schema: JSONSchema | { $ref: string } }> }> {
    const responses: Record<string, { description: string; content?: Record<string, { schema: JSONSchema | { $ref: string } }> }> = {};

    // 成功响应
    if (route.method === 'delete') {
      responses['204'] = { description: '删除成功' };
    } else if (route.method === 'post') {
      responses['201'] = {
        description: '创建成功',
        content: {
          'application/json': {
            schema: this.buildSuccessResponseSchema(route),
          },
        },
      };
    } else {
      responses['200'] = {
        description: '成功',
        content: {
          'application/json': {
            schema: this.buildSuccessResponseSchema(route),
          },
        },
      };
    }

    // 错误响应
    if (route.requiresAuth) {
      responses['401'] = { description: '未授权' };
    }

    // 从 JSDoc 添加额外响应
    if (route.jsDoc?.responses) {
      for (const resp of route.jsDoc.responses) {
        if (!responses[String(resp.status)]) {
          responses[String(resp.status)] = { description: resp.description };
        }
      }
    }

    // 常见错误响应
    if (route.path.includes('{')) {
      responses['404'] = { description: '资源不存在' };
    }

    return responses;
  }

  /**
   * 构建成功响应 Schema
   */
  private buildSuccessResponseSchema(route: RouteInfo): JSONSchema | { $ref: string } {
    const responseSchema = this.inferResponseSchema(route);

    return {
      type: 'object',
      properties: {
        code: { type: 'integer', example: 0 },
        message: { type: 'string', example: 'success' },
        data: responseSchema ? { $ref: `#/components/schemas/${responseSchema}` } : { type: 'object' },
      },
    };
  }

  /**
   * 推断响应 Schema
   */
  private inferResponseSchema(route: RouteInfo): string | null {
    const pathParts = route.path.split('/').filter(Boolean);
    const resource = pathParts[0];

    // 特殊处理 reset-token 端点
    if (route.path === '/config/reset-token' && route.method === 'post') {
      return 'ResetTokenResult';
    }

    // 列表响应
    if (route.method === 'get' && !route.path.includes('{')) {
      const schemaMap: Record<string, string> = {
        channels: 'Channel',
        apps: 'App',
        messages: 'Message',
      };
      return schemaMap[resource] || null;
    }

    // 单个资源响应
    if (route.method === 'get' || route.method === 'post' || route.method === 'put') {
      const schemaMap: Record<string, string> = {
        channels: 'Channel',
        apps: 'App',
        openids: 'OpenID',
        messages: 'Message',
        config: 'SystemConfig',
      };
      if (route.path.includes('/openids')) {
        return 'OpenID';
      }
      return schemaMap[resource] || null;
    }

    return null;
  }

  /**
   * 生成 summary
   */
  private generateSummary(route: RouteInfo): string {
    const resource = this.getResourceName(route);
    const methodSummaries: Record<string, string> = {
      get: route.path.includes('{') ? `获取${resource}详情` : `获取${resource}列表`,
      post: `创建${resource}`,
      put: `更新${resource}`,
      delete: `删除${resource}`,
      patch: `部分更新${resource}`,
    };
    return methodSummaries[route.method] || `${route.method.toUpperCase()} ${route.path}`;
  }

  /**
   * 获取资源名称
   */
  private getResourceName(route: RouteInfo): string {
    const resourceNames: Record<string, string> = {
      channels: '渠道',
      apps: '应用',
      openids: 'OpenID',
      messages: '消息',
      config: '配置',
      init: '初始化',
      auth: '认证',
      stats: '统计',
    };

    const pathParts = route.path.split('/').filter(Boolean);
    for (const part of pathParts) {
      if (resourceNames[part]) {
        return resourceNames[part];
      }
    }
    return '资源';
  }

  /**
   * 生成 operationId
   */
  private generateOperationId(route: RouteInfo): string {
    const pathParts = route.path
      .replace(/\{([^}]+)\}/g, 'By$1')
      .split('/')
      .filter(Boolean)
      .map((part, index) => {
        if (index === 0) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      });

    const pathName = pathParts.join('');
    return `${route.method}${pathName.charAt(0).toUpperCase()}${pathName.slice(1)}`;
  }

  /**
   * 添加 Webhook 路由
   */
  private addWebhookPaths(): void {
    const webhookPath = '/{appKey}.send';

    this.spec.paths[webhookPath] = {
      parameters: [
        {
          name: 'appKey',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: '应用 Key (APK...)',
        },
      ],
      get: {
        tags: ['Webhook'],
        summary: '发送消息 (GET)',
        description: '通过 URL 参数发送消息',
        operationId: 'sendMessageGet',
        parameters: [
          { name: 'title', in: 'query', required: true, schema: { type: 'string' }, description: '消息标题' },
          { name: 'desp', in: 'query', schema: { type: 'string' }, description: '消息内容' },
        ],
        responses: {
          '200': {
            description: '发送成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    data: { $ref: '#/components/schemas/PushResult' },
                  },
                },
              },
            },
          },
          '400': { description: '参数错误' },
          '404': { description: '应用不存在' },
        },
      },
      post: {
        tags: ['Webhook'],
        summary: '发送消息 (POST)',
        description: '通过 JSON Body 发送消息',
        operationId: 'sendMessagePost',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PushMessageInput' },
            },
          },
        },
        responses: {
          '200': {
            description: '发送成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    data: { $ref: '#/components/schemas/PushResult' },
                  },
                },
              },
            },
          },
          '400': { description: '参数错误' },
          '404': { description: '应用不存在' },
        },
      },
    };
  }

  /**
   * 获取构建的规范
   */
  getSpec(): OpenAPISpec {
    return this.spec;
  }
}
