<template>
  <div class="space-y-2">
    <div
      v-for="app in apps"
      :key="app.id"
      class="card card-md cursor-pointer"
      :class="[
        selectedId === app.id
          ? 'card-selected'
          : 'card-hoverable'
      ]"
      @click="$emit('select', app.id)"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Icon icon="tabler:app-window" class="icon-primary text-lg" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm truncate text-[var(--text-primary)]">{{ app.name }}</div>
          <div class="text-xs text-[var(--text-secondary)] truncate flex items-center gap-1">
            <Icon icon="tabler:key" class="text-xs" />
            {{ app.key }}
          </div>
        </div>
      </div>
      <div class="flex gap-1 mt-2">
        <span
          class="badge badge-xs"
          :class="app.pushMode === 'single' ? 'badge-soft-primary' : 'badge-soft-secondary'"
        >
          {{ app.pushMode === 'single' ? '单播' : '订阅' }}
        </span>
        <span
          class="badge badge-xs"
          :class="app.messageType === 'template' ? 'badge-soft-warning' : 'badge-soft-neutral'"
        >
          {{ app.messageType === 'template' ? '模板消息' : '普通消息' }}
        </span>
      </div>
    </div>

    <div v-if="apps.length === 0" class="text-center py-8 text-[var(--text-muted)]">
      <Icon icon="tabler:apps-off" class="text-4xl mb-2 opacity-50" />
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
