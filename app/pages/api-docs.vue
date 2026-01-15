<template>
  <div class="api-docs-page">
    <iframe
      ref="iframeRef"
      class="api-docs-iframe"
      :srcdoc="iframeSrcdoc"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const iframeRef = ref<HTMLIFrameElement | null>(null)

// 获取当前页面的 origin
const origin = computed(() => {
  if (import.meta.client) {
    return window.location.origin
  }
  return ''
})

const iframeSrcdoc = computed(() => {
  const darkModeClass = isDark.value ? 'dark' : 'light'
  const specUrl = `${origin.value}/openapi.json`
  
  return `<!DOCTYPE html>
<html class="${darkModeClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #app { height: 100%; width: 100%; }
    
    /* Light mode */
    .light .scalar-api-reference {
      --scalar-background-1: #ffffff;
      --scalar-background-2: #f8fafc;
      --scalar-background-3: #f1f5f9;
      --scalar-color-1: #1e293b;
      --scalar-color-2: #475569;
      --scalar-color-3: #64748b;
      --scalar-border-color: #e2e8f0;
    }
    
    /* Dark mode */
    .dark .scalar-api-reference {
      --scalar-background-1: #0a0a0a;
      --scalar-background-2: #171717;
      --scalar-background-3: #262626;
      --scalar-color-1: #fafafa;
      --scalar-color-2: #a1a1aa;
      --scalar-color-3: #71717a;
      --scalar-border-color: #27272a;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.43.4/dist/browser/standalone.min.js"><\/script>
  <script>
    Scalar.createApiReference('#app', {
      spec: {
        url: '${specUrl}'
      },
      darkMode: ${isDark.value},
      hideModels: false,
      hideDownloadButton: false,
      hideDarkModeToggle: true,
      defaultHttpClient: {
        targetKey: 'shell',
        clientKey: 'curl'
      }
    });
  <\/script>
</body>
</html>`
})
</script>

<style scoped>
.api-docs-page {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.api-docs-iframe {
  flex: 1;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
