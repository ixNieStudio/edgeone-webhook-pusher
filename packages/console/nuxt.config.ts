// https://nuxt.com/docs/api/configuration/nuxt-config
import Components from 'unplugin-vue-components/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SPA mode
  ssr: false,

  // Output to root .output/public
  nitro: {
    output: {
      dir: '../../.output',
      publicDir: '../../.output/public',
    },
    preset: 'static',
  },

  // Modules
  modules: ['@pinia/nuxt'],

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
