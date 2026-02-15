/**
 * RouteScanner - 扫描 Koa 路由文件
 * 
 * 通过正则表达式和简单的文本分析提取路由信息
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RouteInfo, JSDocInfo } from './types.js';
import { convertPathParams } from './schema-extractor.js';
import { JSDocParser } from './jsdoc-parser.js';

export class RouteScanner {
  private routesDir: string;
  private jsDocParser: JSDocParser;

  constructor(routesDir: string) {
    this.routesDir = routesDir;
    this.jsDocParser = new JSDocParser();
  }

  /**
   * 扫描目录下所有路由文件
   */
  async scanDirectory(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    
    if (!fs.existsSync(this.routesDir)) {
      console.warn(`Routes directory not found: ${this.routesDir}`);
      return routes;
    }

    const files = fs.readdirSync(this.routesDir);
    
    for (const file of files) {
      if (!file.endsWith('.ts') || file === 'index.ts') {
        continue;
      }

      const filePath = path.join(this.routesDir, file);
      
      try {
        const fileRoutes = this.parseRouteFile(filePath);
        routes.push(...fileRoutes);
      } catch (error) {
        console.warn(`Failed to parse route file ${file}: ${error}`);
      }
    }

    return routes;
  }

  /**
   * 解析单个路由文件
   */
  parseRouteFile(filePath: string): RouteInfo[] {
    const routes: RouteInfo[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.ts');

    // 提取路由前缀
    const prefix = this.extractPrefix(content);

    // 检测是否使用 adminAuth 中间件
    const usesAuth = this.detectAuthMiddleware(content);

    // 解析 JSDoc 注释
    const jsDocMap = this.jsDocParser.parseFileContent(content);

    // 提取路由定义
    const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1] as RouteInfo['method'];
      const koaPath = match[2];
      const fullKoaPath = prefix + koaPath;
      const openApiPath = convertPathParams(fullKoaPath);

      // 查找对应的 JSDoc
      const jsDoc = this.findJSDocForRoute(content, match.index, jsDocMap);

      // 生成 handler 名称
      const handlerName = this.generateHandlerName(method, openApiPath, fileName);

      routes.push({
        method,
        path: openApiPath,
        koaPath: fullKoaPath,
        prefix,
        requiresAuth: usesAuth,
        handlerName,
        sourceFile: filePath,
        jsDoc,
      });
    }

    return routes;
  }

  /**
   * 提取路由前缀
   */
  private extractPrefix(content: string): string {
    // 匹配 new Router({ prefix: '/xxx' })
    const prefixMatch = content.match(/new\s+Router\s*\(\s*\{\s*prefix\s*:\s*['"`]([^'"`]+)['"`]/);
    return prefixMatch ? prefixMatch[1] : '';
  }

  /**
   * 检测是否使用 adminAuth 中间件
   */
  private detectAuthMiddleware(content: string): boolean {
    // 检查是否导入了 adminAuth
    const hasImport = content.includes('adminAuth');
    // 检查是否使用了 router.use(adminAuth)
    const hasUse = /router\.use\s*\(\s*adminAuth\s*\)/.test(content);
    return hasImport && hasUse;
  }

  /**
   * 查找路由对应的 JSDoc 注释
   */
  private findJSDocForRoute(
    content: string,
    routeIndex: number,
    jsDocMap: Map<number, JSDocInfo>
  ): JSDocInfo | undefined {
    // 查找路由定义之前最近的 JSDoc
    let closestJSDoc: JSDocInfo | undefined;
    let closestDistance = Infinity;

    for (const [endIndex, jsDoc] of jsDocMap) {
      const distance = routeIndex - endIndex;
      // JSDoc 应该在路由定义之前，且距离不超过 200 字符
      if (distance > 0 && distance < closestDistance && distance < 200) {
        closestDistance = distance;
        closestJSDoc = jsDoc;
      }
    }

    return closestJSDoc;
  }

  /**
   * 生成处理函数名称
   */
  private generateHandlerName(method: string, path: string, fileName: string): string {
    // 将路径转换为驼峰命名
    const pathParts = path
      .replace(/\{([^}]+)\}/g, 'By$1') // {id} -> ById
      .split('/')
      .filter(Boolean)
      .map((part, index) => {
        if (index === 0) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      });

    const pathName = pathParts.join('');
    return `${method}${pathName.charAt(0).toUpperCase()}${pathName.slice(1)}`;
  }
}

/**
 * 从文件名推断 tag 名称
 */
export function inferTagFromFileName(fileName: string): string {
  const baseName = path.basename(fileName, '.ts');
  
  const tagMap: Record<string, string> = {
    'channels': 'Channels',
    'apps': 'Apps',
    'openids': 'OpenIDs',
    'messages': 'Messages',
    'init': 'Init',
    'auth': 'Auth',
    'config': 'Config',
    'stats': 'Stats',
    'wechat-msg': 'Webhook',
  };

  return tagMap[baseName] || baseName.charAt(0).toUpperCase() + baseName.slice(1);
}
