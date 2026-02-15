/**
 * SchemaExtractor - 从 TypeScript 类型生成 JSON Schema
 * 
 * 使用 ts-json-schema-generator 从 TypeScript 类型定义提取 JSON Schema
 */

import * as path from 'path';
import * as fs from 'fs';
import { createGenerator, Config } from 'ts-json-schema-generator';
import type { JSONSchema } from './types.js';

// 需要提取的类型列表
const SCHEMA_TYPES = [
  // Channel
  'Channel',
  'CreateChannelInput',
  'UpdateChannelInput',
  'WeChatConfig',
  'ChannelType',
  // App
  'App',
  'CreateAppInput',
  'UpdateAppInput',
  'PushMode',
  'MessageType',
  // OpenID
  'OpenID',
  'CreateOpenIDInput',
  'UpdateOpenIDInput',
  // Message
  'Message',
  'PushMessageInput',
  'PushResult',
  'DeliveryResult',
  // System
  'SystemConfig',
  // API
  'ApiResponse',
];

export class SchemaExtractor {
  private typesDir: string;
  private tsconfigPath: string;

  constructor(typesDir: string, tsconfigPath?: string) {
    this.typesDir = typesDir;
    this.tsconfigPath = tsconfigPath || path.join(typesDir, '../tsconfig.json');
  }

  /**
   * 提取所有预定义类型的 Schema
   */
  extractSchemas(): Record<string, JSONSchema> {
    const schemas: Record<string, JSONSchema> = {};
    const indexPath = path.join(this.typesDir, 'index.ts');

    if (!fs.existsSync(indexPath)) {
      console.warn(`Types index file not found: ${indexPath}`);
      return schemas;
    }

    const config: Config = {
      path: indexPath,
      tsconfig: this.tsconfigPath,
      type: '*', // 提取所有导出的类型
      expose: 'export',
      jsDoc: 'extended',
      skipTypeCheck: true,
    };

    try {
      const generator = createGenerator(config);
      const fullSchema = generator.createSchema('*');

      // 从 definitions 中提取需要的类型
      if (fullSchema.definitions) {
        for (const typeName of SCHEMA_TYPES) {
          if (fullSchema.definitions[typeName]) {
            schemas[typeName] = this.cleanSchema(
              fullSchema.definitions[typeName] as JSONSchema
            );
          }
        }
      }

      // 处理 $ref 引用，转换为 OpenAPI 格式
      this.convertRefs(schemas);

    } catch (error) {
      console.warn(`Failed to extract schemas: ${error}`);
    }

    return schemas;
  }

  /**
   * 提取单个类型的 Schema
   */
  getSchemaForType(typeName: string): JSONSchema | null {
    const indexPath = path.join(this.typesDir, 'index.ts');

    if (!fs.existsSync(indexPath)) {
      return null;
    }

    const config: Config = {
      path: indexPath,
      tsconfig: this.tsconfigPath,
      type: typeName,
      expose: 'export',
      jsDoc: 'extended',
      skipTypeCheck: true,
    };

    try {
      const generator = createGenerator(config);
      const schema = generator.createSchema(typeName);
      return this.cleanSchema(schema as JSONSchema);
    } catch (error) {
      console.warn(`Failed to extract schema for ${typeName}: ${error}`);
      return null;
    }
  }

  /**
   * 清理 Schema，移除不需要的字段
   */
  private cleanSchema(schema: JSONSchema): JSONSchema {
    const cleaned: JSONSchema = {};

    if (schema.type) cleaned.type = schema.type;
    if (schema.properties) {
      cleaned.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        cleaned.properties[key] = this.cleanSchema(value as JSONSchema);
      }
    }
    if (schema.required && schema.required.length > 0) {
      cleaned.required = schema.required;
    }
    if (schema.items) {
      cleaned.items = this.cleanSchema(schema.items as JSONSchema);
    }
    if (schema.enum) cleaned.enum = schema.enum;
    if (schema.$ref) cleaned.$ref = schema.$ref;
    if (schema.description) cleaned.description = schema.description;
    if (schema.format) cleaned.format = schema.format;
    if (schema.additionalProperties !== undefined) {
      cleaned.additionalProperties = schema.additionalProperties;
    }

    return cleaned;
  }

  /**
   * 转换 $ref 引用为 OpenAPI 格式
   * ts-json-schema-generator 生成: #/definitions/TypeName
   * OpenAPI 需要: #/components/schemas/TypeName
   */
  private convertRefs(schemas: Record<string, JSONSchema>): void {
    const convertRef = (schema: JSONSchema): void => {
      if (schema.$ref) {
        schema.$ref = schema.$ref.replace(
          '#/definitions/',
          '#/components/schemas/'
        );
      }
      if (schema.properties) {
        for (const prop of Object.values(schema.properties)) {
          convertRef(prop as JSONSchema);
        }
      }
      if (schema.items) {
        convertRef(schema.items as JSONSchema);
      }
    };

    for (const schema of Object.values(schemas)) {
      convertRef(schema);
    }
  }
}

/**
 * 路径参数转换：将 Koa 格式转换为 OpenAPI 格式
 * :id -> {id}
 * :userId -> {userId}
 */
export function convertPathParams(koaPath: string): string {
  return koaPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}
