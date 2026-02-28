<template>
  <div class="space-y-3">
    <div
      v-for="app in apps"
      :key="app.id"
      class="card-glass card-md cursor-pointer transition-all duration-200"
      :class="[
        selectedId === app.id
          ? 'card-selected scale-[1.02]'
          : 'card-hoverable hover:scale-[1.01]'
      ]"
      @click="$emit('select', app.id)"
    >
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-900/10 flex items-center justify-center shrink-0 shadow-sm">
          <Icon icon="tabler:app-window" class="icon-primary text-xl" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-[var(--text-primary)] mb-1">{{ app.name }}</div>
          <div class="text-xs text-[var(--text-secondary)] truncate flex items-center gap-1.5 mono">
            <Icon icon="tabler:key" class="text-xs opacity-60" />
            {{ app.key }}
          </div>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <span
          class="badge badge-sm"
          :class="app.pushMode === 'single' ? 'badge-soft-primary' : 'badge-soft-secondary'"
        >
          <Icon :icon="app.pushMode === 'single' ? 'tabler:user' : 'tabler:users'" class="text-xs mr-1" />
          {{ app.pushMode === 'single' ? '单播' : '订阅' }}
        </span>
        <span
          class="badge badge-sm"
          :class="app.messageType === 'template' ? 'badge-soft-warning' : 'badge-soft-neutral'"
        >
          <Icon :icon="app.messageType === 'template' ? 'tabler:template' : 'tabler:message'" class="text-xs mr-1" />
          {{ app.messageType === 'template' ? '模板消息' : '普通消息' }}
        </span>
      </div>
    </div>

    <div v-if="apps.length === 0" class="text-center py-16 text-[var(--text-muted)]">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
        <Icon icon="tabler:apps-off" class="text-3xl opacity-40" />
      </div>
      <p class="text-sm font-medium">暂无应用</p>
      <p class="text-xs mt-1 opacity-60">点击上方按钮创建第一个应用</p>
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
