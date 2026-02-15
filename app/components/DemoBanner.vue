<template>
  <div v-if="isDemoMode" class="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
    <div class="max-w-7xl mx-auto px-4 py-3">
      <div class="flex items-center gap-3">
        <Icon icon="heroicons:exclamation-triangle" class="text-yellow-600 dark:text-yellow-400 text-xl shrink-0" />
        <div class="flex-1">
          <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            体验模式
          </p>
          <p class="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
            您正在使用体验模式。应用数据将在 3 天后自动删除，请勿用于生产环境。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

const config = useRuntimeConfig();
const isDemoMode = config.public.demoMode;
</script>
