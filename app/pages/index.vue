<template>
  <div class="h-full">
    <!-- Demo Mode: Show demo experience page -->
    <DemoAppsPage v-if="isDemoMode" />
    <!-- Normal Mode: Redirect to /admin/apps -->
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center">
        <Icon icon="svg-spinners:ring-resize" class="text-5xl text-primary-600 mx-auto mb-4" />
        <p class="text-sm text-[var(--text-secondary)] font-medium">正在跳转...</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue';
const config = useRuntimeConfig();
const isDemoMode = config.public.demoMode;
// Set layout dynamically
setPageLayout(isDemoMode ? 'demo' : 'default');
definePageMeta({
  middleware: [
    function (to) {
      const config = useRuntimeConfig();
      const isDemoMode = config.public.demoMode;
      
      // Redirect to /admin/apps in non-demo mode
      if (!isDemoMode && to.path === '/') {
        return navigateTo('/admin/apps', { replace: true });
      }
    }
  ]
});
</script>
