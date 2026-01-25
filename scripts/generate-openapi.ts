/**
 * OpenAPI 规范自动生成脚本
 * 
 * 基于 TypeScript 类型定义和路由扫描自动生成 OpenAPI 3.0 规范
 * 
 * 使用方法: yarn generate:openapi
 */

import * as fs from 'fs';
import * as path from 'path';
import { RouteScanner } from './openapi/route-scanner.js';
import { SchemaExtractor } from './openapi/schema-extractor.js';
import { JSDocParser } from './openapi/jsdoc-parser.js';
import { OpenAPIBuilder } from './openapi/openapi-builder.js';
import type { RouteInfo, JSONSchema } from './openapi/types.js';

// 配置
const CONFIG = {
  routesDir: 'node-functions/routes',
  typesDir: 'node-functions/types',
  outputPaths: [
    'docs/openapi.json',
    'public/openapi.json',
  ],
  // 需要提取的类型名称
  schemaTypes: [
    'Channel',
    'App', 
    'OpenID',
    'Message',
    'SystemConfig',
    'PushResult',
    'CreateChannelInput',
    'UpdateChannelInput',
    'CreateAppInput',
    'UpdateAppInput',
    'CreateOpenIDInput',
    'UpdateOpenIDInput',
    'PushMessageInput',
    'ResetTokenRequest',
    'ResetTokenResult',
  ],
};

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 Starting OpenAPI generation...\n');

  try {
    // 1. 扫描路由
    console.log('📂 Scanning routes...');
    const routeScanner = new RouteScanner(CONFIG.routesDir);
    const routes = await routeScanner.scanDirectory();
    console.log(`   Found ${routes.length} routes\n`);

    // 2. 解析 JSDoc 注释
    console.log('📝 Parsing JSDoc comments...');
    const jsDocParser = new JSDocParser();
    const routesWithDocs = await enrichRoutesWithJSDoc(routes, jsDocParser);
    console.log(`   Enriched ${routesWithDocs.length} routes with documentation\n`);

    // 3. 提取 Schema
    console.log('🔧 Extracting schemas from TypeScript types...');
    const schemas = await extractSchemas();
    console.log(`   Extracted ${Object.keys(schemas).length} schemas\n`);

    // 4. 构建 OpenAPI 规范
    console.log('🏗️  Building OpenAPI specification...');
    const builder = new OpenAPIBuilder();
    const spec = builder.build(routesWithDocs, schemas);
    console.log(`   Generated spec with ${Object.keys(spec.paths).length} paths\n`);

    // 5. 写入文件
    console.log('💾 Writing output files...');
    for (const outputPath of CONFIG.outputPaths) {
      const fullPath = path.join(process.cwd(), outputPath);
      const dir = path.dirname(fullPath);
      
      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, JSON.stringify(spec, null, 2));
      console.log(`   ✅ ${outputPath}`);
    }

    console.log('\n✨ OpenAPI spec generated successfully!');
  } catch (error) {
    console.error('\n❌ Error generating OpenAPI spec:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * 为路由添加 JSDoc 文档
 * 注意：RouteScanner 已经在扫描时解析了 JSDoc，这里只是确保路由有文档
 */
async function enrichRoutesWithJSDoc(
  routes: RouteInfo[],
  _jsDocParser: JSDocParser
): Promise<RouteInfo[]> {
  // RouteScanner 已经在 parseRouteFile 中解析了 JSDoc
  // 这里直接返回路由，因为 jsDoc 已经被填充
  return routes;
}

/**
 * 从 TypeScript 类型提取 Schema
 */
async function extractSchemas(): Promise<Record<string, JSONSchema>> {
  const schemas: Record<string, JSONSchema> = {};
  
  try {
    const schemaExtractor = new SchemaExtractor(CONFIG.typesDir);
    const extractedSchemas = schemaExtractor.extractSchemas();
    
    // 只保留我们需要的类型
    for (const [name, schema] of Object.entries(extractedSchemas)) {
      if (CONFIG.schemaTypes.includes(name)) {
        schemas[name] = schema;
      }
    }
    
    console.log(`   Extracted ${Object.keys(schemas).length} schemas from TypeScript types`);
  } catch (error) {
    console.warn(`   ⚠️  Could not extract schemas from TypeScript types: ${error}`);
  }

  // 添加回退 schemas（如果自动提取失败或缺少某些类型）
  addFallbackSchemas(schemas);

  return schemas;
}

/**
 * 添加回退 Schema 定义
 * 当自动提取失败时使用这些预定义的 schema
 */
function addFallbackSchemas(schemas: Record<string, JSONSchema>): void {
  const fallbackSchemas: Record<string, JSONSchema> = {
    Channel: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'ch_abc123' },
        name: { type: 'string', example: '我的公众号' },
        type: { type: 'string', enum: ['wechat'], example: 'wechat' },
        config: {
          type: 'object',
          properties: {
            appId: { type: 'string', example: 'wx1234567890' },
            appSecret: { type: 'string', example: '****' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    App: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'app_xyz789' },
        key: { type: 'string', example: 'APK1234567890abcdef' },
        name: { type: 'string', example: '服务器监控' },
        channelId: { type: 'string', example: 'ch_abc123' },
        pushMode: { type: 'string', enum: ['single', 'subscribe'], example: 'single' },
        messageType: { type: 'string', enum: ['normal', 'template'], example: 'template' },
        templateId: { type: 'string', example: 'tpl_xxx' },
        openIdCount: { type: 'integer', example: 5 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    OpenID: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'oid_def456' },
        appId: { type: 'string', example: 'app_xyz789' },
        openId: { type: 'string', example: 'oXXXX-xxxxxxxxxxxxx' },
        nickname: { type: 'string', example: '张三' },
        remark: { type: 'string', example: '管理员' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Message: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'msg_ghi789' },
        appId: { type: 'string', example: 'app_xyz789' },
        title: { type: 'string', example: '服务器告警' },
        desp: { type: 'string', example: 'CPU 使用率超过 90%' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              openId: { type: 'string' },
              success: { type: 'boolean' },
              msgId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    PushResult: {
      type: 'object',
      properties: {
        pushId: { type: 'string', example: 'msg_ghi789' },
        total: { type: 'integer', example: 3 },
        success: { type: 'integer', example: 2 },
        failed: { type: 'integer', example: 1 },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              openId: { type: 'string' },
              success: { type: 'boolean' },
              msgId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    PushMessageInput: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: '消息标题' },
        desp: { type: 'string', description: '消息内容' },
      },
    },
    SystemConfig: {
      type: 'object',
      properties: {
        adminToken: { type: 'string', example: 'wh_****' },
        rateLimit: {
          type: 'object',
          properties: {
            perMinute: { type: 'integer', example: 5 },
          },
        },
        retention: {
          type: 'object',
          properties: {
            days: { type: 'integer', example: 30 },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    CreateChannelInput: {
      type: 'object',
      required: ['name', 'type', 'config'],
      properties: {
        name: { type: 'string', example: '我的公众号' },
        type: { type: 'string', enum: ['wechat'], example: 'wechat' },
        config: {
          type: 'object',
          required: ['appId', 'appSecret'],
          properties: {
            appId: { type: 'string', example: 'wx1234567890' },
            appSecret: { type: 'string', example: 'your_app_secret' },
          },
        },
      },
    },
    CreateAppInput: {
      type: 'object',
      required: ['name', 'channelId', 'pushMode', 'messageType'],
      properties: {
        name: { type: 'string', example: '服务器监控' },
        channelId: { type: 'string', example: 'ch_abc123' },
        pushMode: { type: 'string', enum: ['single', 'subscribe'], example: 'single' },
        messageType: { type: 'string', enum: ['normal', 'template'], example: 'template' },
        templateId: { type: 'string', description: 'messageType=template 时必填' },
      },
    },
    CreateOpenIDInput: {
      type: 'object',
      required: ['openId'],
      properties: {
        openId: { type: 'string', example: 'oXXXX-xxxxxxxxxxxxx' },
        nickname: { type: 'string', example: '张三' },
        remark: { type: 'string', example: '管理员' },
      },
    },
    UpdateChannelInput: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        config: {
          type: 'object',
          properties: {
            appId: { type: 'string' },
            appSecret: { type: 'string' },
          },
        },
      },
    },
    UpdateAppInput: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        templateId: { type: 'string' },
      },
    },
    UpdateOpenIDInput: {
      type: 'object',
      properties: {
        nickname: { type: 'string' },
        remark: { type: 'string' },
      },
    },
    PushMode: {
      type: 'string',
      enum: ['single', 'subscribe'],
      description: '推送模式',
    },
    MessageType: {
      type: 'string',
      enum: ['normal', 'template'],
      description: '消息类型',
    },
    ChannelType: {
      type: 'string',
      enum: ['wechat'],
      description: '渠道类型',
    },
    WeChatConfig: {
      type: 'object',
      required: ['appId', 'appSecret'],
      properties: {
        appId: { type: 'string', description: '微信公众号 AppID' },
        appSecret: { type: 'string', description: '微信公众号 AppSecret' },
      },
    },
    DeliveryResult: {
      type: 'object',
      properties: {
        openId: { type: 'string' },
        success: { type: 'boolean' },
        msgId: { type: 'string' },
        error: { type: 'string' },
      },
    },
    ResetTokenRequest: {
      type: 'object',
      properties: {
        newPassword: {
          type: 'string',
          description: '自定义密码（可选）。需符合复杂度要求：至少12个字符，包含大小写字母、数字和特殊字符',
          example: 'MySecurePass123!',
        },
        confirmPassword: {
          type: 'string',
          description: '确认密码（使用自定义密码时必填）',
          example: 'MySecurePass123!',
        },
      },
    },
    ResetTokenResult: {
      type: 'object',
      properties: {
        adminToken: {
          type: 'string',
          description: '新的管理员令牌',
          example: 'AT_MySecurePass123!',
        },
        message: {
          type: 'string',
          description: '提示信息',
          example: '管理员密码已重置为自定义密码。请妥善保管新密码，旧令牌已失效。',
        },
        isCustomPassword: {
          type: 'boolean',
          description: '是否使用自定义密码',
          example: true,
        },
      },
    },
  };

  // 只添加缺失的 schema
  for (const [name, schema] of Object.entries(fallbackSchemas)) {
    if (!schemas[name]) {
      schemas[name] = schema;
    }
  }
}

// 运行主函数
main();
