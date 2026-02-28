// https://nuxt.com/docs/api/configuration/nuxt-config
import { cpSync } from 'fs';
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
  // /api/* 请求由 EdgeOne dev server 的 Edge Functions 处理（不代理）
  vite: {
    server: {
      proxy: {
        '/v1': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/v1/, ''),
        },
      },
      watch: {
        ignored: ['**/node-functions/**', '**/edge-functions/**', '**/edge-functions-src/**'],
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
    ignore: ['node-functions/**', 'edge-functions/**', 'edge-functions-src/**'],
  },

  hooks: {
    'nitro:build:public-assets': () => {
      const rootDir = process.cwd();
      const distDir = resolve(rootDir, 'dist');

      // 复制 Node Functions 到 dist/，确保部署产物包含 /v1/* 路由
      cpSync(resolve(rootDir, 'node-functions'), resolve(distDir, 'node-functions'), { recursive: true });
      console.log('✓ Copied node-functions to dist/');

      // 注入密钥到根目录 edge-functions/
      const { execSync } = require('child_process');
      try {
        execSync('tsx scripts/generate-internal-key.ts', { stdio: 'inherit' });
        console.log('✓ Injected internal key into edge-functions/');

        // 复制 Edge Functions 到 dist/，确保部署产物包含 /api/* 路由
        cpSync(resolve(rootDir, 'edge-functions'), resolve(distDir, 'edge-functions'), { recursive: true });
        console.log('✓ Copied edge-functions to dist/');
      } catch (error) {
        console.error('❌ Failed to inject internal key:', error);
        process.exit(1);
      }
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
