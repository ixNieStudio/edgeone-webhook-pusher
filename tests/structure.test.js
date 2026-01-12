/**
 * Project Structure Tests
 * Validates flattened Nuxt 4 project structure with EdgeOne Functions
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();

describe('Project Structure', () => {
  describe('Nuxt 4 Project Structure (Flattened)', () => {
    it('should have nuxt.config.ts at root', () => {
      expect(existsSync(join(rootDir, 'nuxt.config.ts'))).toBe(true);
    });

    it('should have app/ directory at root', () => {
      expect(existsSync(join(rootDir, 'app'))).toBe(true);
    });

    it('should have public/ directory at root', () => {
      expect(existsSync(join(rootDir, 'public'))).toBe(true);
    });

    it('should have tsconfig.json at root', () => {
      expect(existsSync(join(rootDir, 'tsconfig.json'))).toBe(true);
    });

    it('should NOT have console/ subdirectory', () => {
      expect(existsSync(join(rootDir, 'console'))).toBe(false);
    });

    it('should NOT have packages/ directory', () => {
      expect(existsSync(join(rootDir, 'packages'))).toBe(false);
    });
  });

  describe('App Directory Structure', () => {
    const appDir = join(rootDir, 'app');

    it('should have app.vue', () => {
      expect(existsSync(join(appDir, 'app.vue'))).toBe(true);
    });

    it('should have pages/ directory', () => {
      expect(existsSync(join(appDir, 'pages'))).toBe(true);
    });

    it('should have layouts/ directory', () => {
      expect(existsSync(join(appDir, 'layouts'))).toBe(true);
    });

    it('should have composables/ directory', () => {
      expect(existsSync(join(appDir, 'composables'))).toBe(true);
    });
  });

  describe('Edge Functions Structure', () => {
    const edgeFunctionsDir = join(rootDir, 'edge-functions');

    it('should have edge-functions/ at root level', () => {
      expect(existsSync(edgeFunctionsDir)).toBe(true);
    });

    it('should have api/kv/users.js', () => {
      expect(existsSync(join(edgeFunctionsDir, 'api', 'kv', 'users.js'))).toBe(true);
    });

    it('should have api/kv/channels.js', () => {
      expect(existsSync(join(edgeFunctionsDir, 'api', 'kv', 'channels.js'))).toBe(true);
    });

    it('should have api/kv/messages.js', () => {
      expect(existsSync(join(edgeFunctionsDir, 'api', 'kv', 'messages.js'))).toBe(true);
    });
  });

  describe('Node Functions Structure', () => {
    const nodeFunctionsDir = join(rootDir, 'node-functions');

    it('should have node-functions/ at root level', () => {
      expect(existsSync(nodeFunctionsDir)).toBe(true);
    });

    it('should have v1/[[default]].js (API routes)', () => {
      expect(existsSync(join(nodeFunctionsDir, 'v1', '[[default]].js'))).toBe(true);
    });

    it('should have send/[[default]].js (Webhook routes)', () => {
      expect(existsSync(join(nodeFunctionsDir, 'send', '[[default]].js'))).toBe(true);
    });

    it('should NOT have api/ directory (avoid conflict with edge-functions)', () => {
      expect(existsSync(join(nodeFunctionsDir, 'api'))).toBe(false);
    });

    it('should have shared/ directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'shared'))).toBe(true);
    });

    it('should have services/ directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'services'))).toBe(true);
    });

    it('should have middleware/ directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'middleware'))).toBe(true);
    });

    it('should have routes/ directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'routes'))).toBe(true);
    });
  });

  describe('Configuration Files', () => {
    it('should have edgeone.json', () => {
      expect(existsSync(join(rootDir, 'edgeone.json'))).toBe(true);
    });

    it('should have package.json', () => {
      expect(existsSync(join(rootDir, 'package.json'))).toBe(true);
    });

    it('should NOT have build.js (replaced by Nuxt hooks)', () => {
      expect(existsSync(join(rootDir, 'build.js'))).toBe(false);
    });

    it('should NOT have turbo.json', () => {
      expect(existsSync(join(rootDir, 'turbo.json'))).toBe(false);
    });

    it('should NOT have pnpm-workspace.yaml', () => {
      expect(existsSync(join(rootDir, 'pnpm-workspace.yaml'))).toBe(false);
    });
  });

  describe('edgeone.json Configuration', () => {
    const config = JSON.parse(readFileSync(join(rootDir, 'edgeone.json'), 'utf-8'));

    it('should have outputDirectory set to dist', () => {
      expect(config.outputDirectory).toBe('dist');
    });

    it('should have buildCommand as yarn build', () => {
      expect(config.buildCommand).toBe('yarn build');
    });

    it('should have installCommand as yarn install', () => {
      expect(config.installCommand).toBe('yarn install');
    });

    it('should have nodeVersion 22.17.1', () => {
      expect(config.nodeVersion).toBe('22.17.1');
    });
  });

  describe('package.json Configuration', () => {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

    it('should NOT use workspace protocol', () => {
      const deps = JSON.stringify(pkg.dependencies || {});
      const devDeps = JSON.stringify(pkg.devDependencies || {});
      expect(deps).not.toContain('workspace:');
      expect(devDeps).not.toContain('workspace:');
    });

    it('should have Nuxt dependencies', () => {
      expect(pkg.dependencies.nuxt).toBeDefined();
      expect(pkg.dependencies.vue).toBeDefined();
    });

    it('should have Koa dependencies', () => {
      expect(pkg.dependencies.koa).toBeDefined();
      expect(pkg.dependencies['@koa/router']).toBeDefined();
    });

    it('should have dev script for Nuxt', () => {
      expect(pkg.scripts.dev).toBe('nuxt dev');
    });

    it('should have build script for Nuxt', () => {
      expect(pkg.scripts.build).toBe('nuxt generate');
    });

    it('should have test script', () => {
      expect(pkg.scripts.test).toBeDefined();
    });
  });
});
