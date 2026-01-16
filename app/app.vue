<template>
  <div id="app">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Toast Container -->
    <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

onMounted(() => {
  const auth = useAuthStore();
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
