<template>
  <div class="h-full">
    <!-- Demo Mode: Show demo apps page -->
    <DemoAppsPage v-if="isDemoMode" />
    
    <!-- Normal Mode: Redirect to /apps -->
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center">
        <Icon icon="heroicons:arrow-path" class="text-4xl animate-spin text-gray-400 mx-auto mb-4" />
        <p class="text-sm text-gray-600 dark:text-gray-400">正在跳转...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

const config = useRuntimeConfig();
const isDemoMode = config.public.demoMode;

// 动态设置布局
setPageLayout(isDemoMode ? 'demo' : 'default');

definePageMeta({
  middleware: [
    function (to) {
      const config = useRuntimeConfig();
      const isDemoMode = config.public.demoMode;
      
      // 非体验模式下，重定向到 /apps
      if (!isDemoMode && to.path === '/') {
        return navigateTo('/apps', { replace: true });
      }
    }
  ]
});
</script>
