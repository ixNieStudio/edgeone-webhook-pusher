<template>
  <div class="h-full">
    <!-- Demo Mode: Show demo apps page -->
    <DemoAppsPage v-if="isDemoMode" />
    
    <!-- Normal Mode: Redirect handled by middleware -->
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

definePageMeta({
  layout: 'default',
});

const config = useRuntimeConfig();
const isDemoMode = config.public.demoMode;

// 非体验模式下重定向到 /apps
onMounted(() => {
  if (!isDemoMode) {
    navigateTo('/apps', { replace: true });
  }
});
</script>
