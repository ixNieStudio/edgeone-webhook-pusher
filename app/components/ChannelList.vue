<template>
  <div class="space-y-2">
    <div
      v-for="channel in channels"
      :key="channel.id"
      class="card card-md cursor-pointer"
      :class="[
        selectedId === channel.id
          ? 'card-selected'
          : 'card-hoverable'
      ]"
      @click="$emit('select', channel.id)"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
          <Icon icon="tabler:broadcast" class="icon-success text-lg" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm truncate text-[var(--text-primary)]">{{ channel.name }}</div>
          <div class="text-xs text-[var(--text-secondary)] truncate">
            {{ channel.config?.appId || '-' }}
          </div>
        </div>
        <span class="badge badge-xs badge-soft-primary">
          {{ channel.type === 'wechat' ? '微信' : channel.type }}
        </span>
      </div>
    </div>

    <div v-if="channels.length === 0" class="text-center py-8 text-[var(--text-muted)]">
      <Icon icon="tabler:broadcast-off" class="text-4xl mb-2 opacity-50" />
      <p class="text-sm">暂无渠道</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Channel } from '~/types';

defineProps<{
  channels: Channel[];
  selectedId: string | null;
}>();

defineEmits<{
  select: [id: string];
}>();
</script>
