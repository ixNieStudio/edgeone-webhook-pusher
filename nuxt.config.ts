// https://nuxt.com/docs/api/configuration/nuxt-config
import { cpSync } from 'fs';
import { resolve } from 'path';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  
  devtools: { enabled: false },
  ssr: false,

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

      cpSync(resolve(rootDir, 'edge-functions'), resolve(distDir, 'edge-functions'), { recursive: true });
      cpSync(resolve(rootDir, 'node-functions'), resolve(distDir, 'node-functions'), { recursive: true });

      console.log('✓ Copied edge-functions and node-functions to dist/');
    },
  },

  css: ['~/assets/css/main.css'],

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
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
