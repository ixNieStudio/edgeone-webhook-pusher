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

      // 只复制 node-functions 到 dist/（edge-functions 在根目录，EdgeOne 直接读取）
      cpSync(resolve(rootDir, 'node-functions'), resolve(distDir, 'node-functions'), { recursive: true });
      console.log('✓ Copied node-functions to dist/');

      // 注入密钥到根目录的 edge-functions/（EdgeOne 从这里部署）
      const { execSync } = require('child_process');
      try {
        execSync('tsx scripts/generate-internal-key.ts', { stdio: 'inherit' });
        console.log('✓ Injected internal key into edge-functions/');
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
