// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';

const kvBaseUrl = process.env.KV_BASE_URL?.replace(/\/+$/, '');
const nuxtPort = Number(process.env.NUXT_PORT || 3000);
const nodePort = Number(process.env.NODE_PORT || 3101);
const themeBootstrapScript = `
(() => {
  const key = 'theme-mode';
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  let stored = null;

  try {
    stored = window.localStorage.getItem(key);
  } catch {}

  let theme = stored === 'light' || stored === 'dark' ? stored : systemTheme;

  if (stored === 'system') {
    try {
      window.localStorage.setItem(key, theme);
    } catch {}
  }

  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', theme === 'dark' ? '#020617' : '#f6f8fb');
  }
})();
`;

const devProxy: Record<string, { target: string; changeOrigin: boolean; rewrite?: (path: string) => string }> = {
  '/v1': {
    target: `http://localhost:${nodePort}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/v1/, ''),
  },
  '/mcp': {
    target: `http://localhost:${nodePort}`,
    changeOrigin: true,
  },
};

if (kvBaseUrl) {
  devProxy['/api'] = {
    target: kvBaseUrl,
    changeOrigin: true,
  };
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: false },
  ssr: false,

  // 运行时配置
  runtimeConfig: {
    public: {},
  },

  devServer: {
    port: nuxtPort,
  },

  // 开发模式代理配置
  // 将 /v1/* 请求代理到本地 Node Functions 服务器
  // rewrite 去掉 /v1 前缀，因为 Node Functions 本地运行时路由不带 /v1
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: devProxy,
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
      ignore: ['/api/**', '/v1/**', '/send/**', '/mcp', '/mcp/**'],
    },
  },

  css: ['~/assets/css/main.css'],

  modules: ['@pinia/nuxt'],

  app: {
    head: {
      title: 'EdgeOne MCP Pusher',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Self-hosted free WeChat push service and standard MCP server on EdgeOne' },
        { name: 'theme-color', content: '#f6f8fb' },
      ],
      script: [
        {
          key: 'theme-bootstrap',
          innerHTML: themeBootstrapScript,
          tagPosition: 'head',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
});
