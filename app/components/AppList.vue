<template>
  <div class="space-y-2">
    <div
      v-for="app in apps"
      :key="app.id"
      class="p-3 rounded-lg cursor-pointer transition-colors"
      :class="[
        selectedId === app.id
          ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
      ]"
      @click="$emit('select', app.id)"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Icon icon="heroicons:cube" class="text-blue-600 dark:text-blue-400 text-lg" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm truncate">{{ app.name }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
            <Icon icon="heroicons:key" class="text-xs" />
            {{ app.key }}
          </div>
        </div>
      </div>
      <div class="flex gap-1 mt-2">
        <span
          class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
          :class="app.pushMode === 'single' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
        >
          {{ app.pushMode === 'single' ? '单播' : '订阅' }}
        </span>
        <span
          class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
          :class="app.messageType === 'template' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'"
        >
          {{ app.messageType === 'template' ? '模板消息' : '普通消息' }}
        </span>
      </div>
    </div>

    <div v-if="apps.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
      <Icon icon="heroicons:cube-transparent" class="text-4xl mb-2 opacity-50" />
      <p class="text-sm">暂无应用</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { AppWithCount } from '~/types';

defineProps<{
  apps: AppWithCount[];
  selectedId: string | null;
}>();

defineEmits<{
  select: [id: string];
}>();
</script>
