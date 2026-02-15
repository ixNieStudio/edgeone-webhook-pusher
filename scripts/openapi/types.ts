/**
 * OpenAPI 生成器类型定义
 */

export interface RouteInfo {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;           // OpenAPI 格式: /channels/{id}
  koaPath: string;        // Koa 格式: /channels/:id
  prefix: string;         // 路由前缀
  requiresAuth: boolean;  // 是否需要认证
  handlerName: string;    // 处理函数名
  sourceFile: string;     // 源文件路径
  jsDoc?: JSDocInfo;      // JSDoc 注释信息
}

export interface JSDocInfo {
  summary?: string;
  description?: string;
  tags?: string[];
  params?: Array<{
    name: string;
    type?: string;
    description?: string;
    in?: 'path' | 'query' | 'body';
  }>;
  responses?: Array<{
    status: number;
    description: string;
    schema?: string;
  }>;
  openapi?: object;  // @openapi 块的内容
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, JSONSchema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  parameters?: Parameter[];
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: Array<Record<string, string[]>>;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: JSONSchema;
}

export interface RequestBody {
  required?: boolean;
  content: Record<string, MediaType>;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema?: JSONSchema | { $ref: string };
}

export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: (string | number)[];
  $ref?: string;
  description?: string;
  format?: string;
  example?: unknown;
  default?: unknown;
  additionalProperties?: boolean | JSONSchema;
}

export interface SecurityScheme {
  type: string;
  scheme?: string;
  in?: string;
  name?: string;
  description?: string;
}
