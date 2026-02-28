// https://nuxt.com/docs/api/configuration/nuxt-config
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { resolve } from 'path';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  
  devtools: { enabled: false },
  ssr: false,

  // 运行时配置
  runtimeConfig: {
    public: {
      demoMode: process.env.DEMO_MODE === 'true',
      adminBasePath: process.env.DEMO_MODE === 'true' ? '/admin' : '',
    },
  },

  // 开发模式代理配置
  // 将 /v1/* 请求代理到本地 Node Functions 服务器
  // rewrite 去掉 /v1 前缀，因为 Node Functions 本地运行时路由不带 /v1
  vite: {
    server: {
      proxy: {
        '/v1': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/v1/, ''),
        },
      },
    },
  },

  nitro: {
    output: {
      dir: 'dist',
      publicDir: 'dist',
    },
    preset: 'static',
    compressPublicAssets: true,
    prerender: {
      crawlLinks: false,
      routes: ['/'],
      ignore: ['/api/**', '/v1/**', '/send/**'],
    },
  },

  hooks: {
    'nitro:build:public-assets': () => {
      const rootDir = process.cwd();
      const distDir = resolve(rootDir, 'dist');
      const runtimeKey = randomBytes(32).toString('hex');
      const keyPattern = /const BUILD_KEY = ['"]([a-f0-9]{64}|__BUILD_KEY_PLACEHOLDER__)['"];?/g;

      // 复制 Node Functions 到 dist/，确保部署产物包含 /v1/* 路由
      cpSync(resolve(rootDir, 'node-functions'), resolve(distDir, 'node-functions'), { recursive: true });
      console.log('✓ Copied node-functions to dist/');

      // 复制 Edge Functions 到 dist/，确保部署产物包含 /api/* 路由
      cpSync(resolve(rootDir, 'edge-functions'), resolve(distDir, 'edge-functions'), { recursive: true });
      console.log('✓ Copied edge-functions to dist/');

      // 将动态 key 写入 dist/shared/internal-key.json（不修改源码）
      const sharedDir = resolve(distDir, 'shared');
      mkdirSync(sharedDir, { recursive: true });
      writeFileSync(
        resolve(sharedDir, 'internal-key.json'),
        JSON.stringify(
          {
            buildKey: runtimeKey,
            generatedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
      console.log('✓ Generated dist/shared/internal-key.json');

      // 注入动态 key 到 dist/edge-functions（不修改源码）
      const kvDir = resolve(distDir, 'edge-functions', 'api', 'kv');
      if (!existsSync(kvDir)) {
        throw new Error(`KV functions directory not found: ${kvDir}`);
      }

      const kvFiles = readdirSync(kvDir).filter((file) => file.endsWith('.js'));
      for (const file of kvFiles) {
        const filePath = resolve(kvDir, file);
        const content = readFileSync(filePath, 'utf-8');
        keyPattern.lastIndex = 0;
        const replaced = content.replace(keyPattern, `const BUILD_KEY = '${runtimeKey}';`);
        writeFileSync(filePath, replaced);
      }
      console.log(`✓ Injected runtime BUILD_KEY into dist edge-functions (${kvFiles.length} files)`);
    },
  },

  css: ['~/assets/css/main.css'],

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  // 组件自动导入配置
  components: [
    {
      path: '~/components',
      pathPrefix: false, // 不添加目录前缀，保持组件名称扁平化
    },
  ],
  router: {
    options: {
      linkActiveClass: 'active',
      linkExactActiveClass: 'exact-active',
    },
  },

  app: {
    head: {
      title: 'EdgeOne Webhook Pusher',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Serverless webhook push service' },
      ],
    },
  },
});
