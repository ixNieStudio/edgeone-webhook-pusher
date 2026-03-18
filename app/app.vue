<template>
  <div id="app">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div id="toast-container" class="fixed right-4 top-4 z-50 space-y-2" />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const { init: initTheme } = useTheme();
const auth = useAuthStore();

if (import.meta.client) {
  initTheme();
}

onMounted(() => {
  auth.init();
});
</script>

<style>
html, body, #__nuxt, #app {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
