// https://nuxt.com/docs/api/configuration/nuxt-config
import { cpSync } from 'fs';
import { resolve } from 'path';
import Components from 'unplugin-vue-components/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SPA mode
  ssr: false,

  // Route rules - empty for SPA mode
  // EdgeOne CLI handles API routes (/v1/*, /send/*, /topic/*) via node-functions
  routeRules: {},

  // Output configuration
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

  // Copy edge-functions and node-functions after build
  hooks: {
    'nitro:build:public-assets': () => {
      const rootDir = process.cwd();
      const distDir = resolve(rootDir, 'dist');

      // Copy edge-functions
      cpSync(
        resolve(rootDir, 'edge-functions'),
        resolve(distDir, 'edge-functions'),
        { recursive: true }
      );

      // Copy node-functions
      cpSync(
        resolve(rootDir, 'node-functions'),
        resolve(distDir, 'node-functions'),
        { recursive: true }
      );

      console.log('✓ Copied edge-functions and node-functions to dist/');
    },
  },

  // Modules
  modules: ['@pinia/nuxt'],

  // Router middleware
  router: {
    options: {
      linkActiveClass: 'active',
      linkExactActiveClass: 'exact-active',
    },
  },

  // TDesign auto-import
  vite: {
    plugins: [
      Components({
        resolvers: [
          TDesignResolver({
            library: 'vue-next',
          }),
        ],
      }),
      AutoImport({
        resolvers: [
          TDesignResolver({
            library: 'vue-next',
          }),
        ],
      }),
    ],
  },

  // CSS
  css: ['tdesign-vue-next/es/style/index.css'],

  // App config
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
