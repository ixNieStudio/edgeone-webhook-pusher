/**
 * JSDocParser - 解析 JSDoc 注释
 * 
 * 使用 comment-parser 解析 JSDoc 注释，提取 API 元数据
 */

import { parse } from 'comment-parser';
import type { JSDocInfo } from './types.js';

export class JSDocParser {
  /**
   * 解析文件内容中的所有 JSDoc 注释
   * 返回 Map<注释结束位置, JSDocInfo>
   */
  parseFileContent(content: string): Map<number, JSDocInfo> {
    const result = new Map<number, JSDocInfo>();
    
    // 匹配所有 JSDoc 注释块
    const jsDocPattern = /\/\*\*[\s\S]*?\*\//g;
    let match;

    while ((match = jsDocPattern.exec(content)) !== null) {
      const comment = match[0];
      const endIndex = match.index + comment.length;
      
      try {
        const jsDocInfo = this.parseComment(comment);
        if (jsDocInfo.summary || jsDocInfo.tags?.length || jsDocInfo.params?.length) {
          result.set(endIndex, jsDocInfo);
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    return result;
  }

  /**
   * 解析单个 JSDoc 注释
   */
  parseComment(comment: string): JSDocInfo {
    const parsed = parse(comment);
    
    if (parsed.length === 0) {
      return {};
    }

    const block = parsed[0];
    const jsDocInfo: JSDocInfo = {};

    // 从 source 中提取原始描述行
    if (block.source && block.source.length > 0) {
      const descLines: string[] = [];
      for (const line of block.source) {
        const desc = line.tokens.description?.trim();
        if (desc && !line.tokens.tag) {
          descLines.push(desc);
        }
      }
      
      if (descLines.length > 0) {
        jsDocInfo.summary = descLines[0];
        if (descLines.length > 1) {
          jsDocInfo.description = descLines.join('\n');
        }
      }
    } else if (block.description) {
      // 回退到 description 字段
      jsDocInfo.summary = block.description.trim();
    }

    // 处理标签
    for (const tag of block.tags) {
      switch (tag.tag.toLowerCase()) {
        case 'tag':
          if (!jsDocInfo.tags) jsDocInfo.tags = [];
          jsDocInfo.tags.push(tag.name || tag.description);
          break;

        case 'param':
          if (!jsDocInfo.params) jsDocInfo.params = [];
          jsDocInfo.params.push({
            name: tag.name,
            type: tag.type || undefined,
            description: tag.description || undefined,
            in: this.inferParamLocation(tag.name, tag.description),
          });
          break;

        case 'returns':
        case 'return':
          if (!jsDocInfo.responses) jsDocInfo.responses = [];
          jsDocInfo.responses.push({
            status: 200,
            description: tag.description || tag.name || 'Success',
            schema: tag.type || undefined,
          });
          break;

        case 'response':
          if (!jsDocInfo.responses) jsDocInfo.responses = [];
          // @response {status} description
          const statusMatch = tag.name.match(/^(\d+)$/);
          jsDocInfo.responses.push({
            status: statusMatch ? parseInt(statusMatch[1], 10) : 200,
            description: tag.description || '',
          });
          break;

        case 'openapi':
          // @openapi 块用于内联 OpenAPI 规范
          try {
            jsDocInfo.openapi = JSON.parse(tag.description || '{}');
          } catch {
            // 忽略 JSON 解析错误
          }
          break;

        case 'summary':
          jsDocInfo.summary = tag.description || tag.name;
          break;

        case 'description':
          jsDocInfo.description = tag.description || tag.name;
          break;
      }
    }

    return jsDocInfo;
  }

  /**
   * 推断参数位置
   */
  private inferParamLocation(
    name: string,
    description?: string
  ): 'path' | 'query' | 'body' | undefined {
    // 常见的路径参数名
    const pathParams = ['id', 'appId', 'channelId', 'openId', 'messageId'];
    if (pathParams.includes(name)) {
      return 'path';
    }

    // 从描述中推断
    if (description) {
      const lowerDesc = description.toLowerCase();
      if (lowerDesc.includes('path')) return 'path';
      if (lowerDesc.includes('query')) return 'query';
      if (lowerDesc.includes('body')) return 'body';
    }

    return undefined;
  }
}

/**
 * 从路由文件头部注释提取 API 信息
 */
export function extractFileHeader(content: string): {
  description?: string;
  routes?: string[];
} {
  const headerMatch = content.match(/^\/\*\*[\s\S]*?\*\//);
  if (!headerMatch) {
    return {};
  }

  const header = headerMatch[0];
  const lines = header
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);

  const result: { description?: string; routes?: string[] } = {};
  const routes: string[] = [];

  for (const line of lines) {
    // 匹配路由定义行，如 "GET /channels - 获取渠道列表"
    const routeMatch = line.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)\s*-?\s*(.*)/i);
    if (routeMatch) {
      routes.push(line);
    } else if (!result.description && !line.toLowerCase().includes('api routes')) {
      result.description = line;
    }
  }

  if (routes.length > 0) {
    result.routes = routes;
  }

  return result;
}
