/**
 * Node Function Export and Structure Tests
 * Property 2: Node Function Default Export
 * Property 3: No HTTP Server Startup
 * Validates: Requirements 3.3, 3.5
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Node Function Default Export', () => {
  const nodeFunctionsDir = join(process.cwd(), 'node-functions');

  describe('API Handler (v1/[[default]].js)', () => {
    const filePath = join(nodeFunctionsDir, 'v1', '[[default]].js');

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have default export', () => {
      const content = readFileSync(filePath, 'utf-8');
      const hasDefaultExport = /export\s+default\s+/.test(content);
      expect(hasDefaultExport).toBe(true);
    });

    it('should not start HTTP server (no listen calls)', () => {
      const content = readFileSync(filePath, 'utf-8');
      const hasListen = /\.listen\s*\(/.test(content);
      expect(hasListen).toBe(false);
    });

    it('should import Koa', () => {
      const content = readFileSync(filePath, 'utf-8');
      const hasKoaImport = /import\s+Koa\s+from\s+['"]koa['"]/.test(content);
      expect(hasKoaImport).toBe(true);
    });
  });

  describe('Webhook Handler (send/[[default]].js)', () => {
    const filePath = join(nodeFunctionsDir, 'send', '[[default]].js');

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have default export', () => {
      const content = readFileSync(filePath, 'utf-8');
      const hasDefaultExport = /export\s+default\s+/.test(content);
      expect(hasDefaultExport).toBe(true);
    });

    it('should not start HTTP server (no listen calls)', () => {
      const content = readFileSync(filePath, 'utf-8');
      const hasListen = /\.listen\s*\(/.test(content);
      expect(hasListen).toBe(false);
    });

    it('should import Koa', () => {
      const content = readFileSync(filePath, 'utf-8');
      const hasKoaImport = /import\s+Koa\s+from\s+['"]koa['"]/.test(content);
      expect(hasKoaImport).toBe(true);
    });
  });
});

describe('Node Function File Structure', () => {
  const nodeFunctionsDir = join(process.cwd(), 'node-functions');

  it('should have shared directory', () => {
    expect(existsSync(join(nodeFunctionsDir, 'shared'))).toBe(true);
  });

  it('should have services directory', () => {
    expect(existsSync(join(nodeFunctionsDir, 'services'))).toBe(true);
  });

  it('should have middleware directory', () => {
    expect(existsSync(join(nodeFunctionsDir, 'middleware'))).toBe(true);
  });

  it('should have routes directory', () => {
    expect(existsSync(join(nodeFunctionsDir, 'routes'))).toBe(true);
  });

  it('should have v1/[[default]].js for catch-all API routes', () => {
    expect(existsSync(join(nodeFunctionsDir, 'v1', '[[default]].js'))).toBe(true);
  });

  it('should have send/[[default]].js for catch-all webhook routes', () => {
    expect(existsSync(join(nodeFunctionsDir, 'send', '[[default]].js'))).toBe(true);
  });

  it('should NOT have api/ directory (avoid conflict with edge-functions)', () => {
    expect(existsSync(join(nodeFunctionsDir, 'api'))).toBe(false);
  });
});
