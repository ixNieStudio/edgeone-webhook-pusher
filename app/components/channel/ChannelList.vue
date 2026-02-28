<template>
  <div class="space-y-3">
    <div
      v-for="channel in channels"
      :key="channel.id"
      class="card-glass card-md cursor-pointer transition-all duration-200"
      :class="[
        selectedId === channel.id
          ? 'card-selected scale-[1.02]'
          : 'card-hoverable hover:scale-[1.01]'
      ]"
      @click="$emit('select', channel.id)"
    >
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-success-100 to-success-50 dark:from-success-900/30 dark:to-success-900/10 flex items-center justify-center shrink-0 shadow-sm">
          <Icon icon="tabler:broadcast" class="icon-success text-xl" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-[var(--text-primary)] mb-1">{{ channel.name }}</div>
          <div class="text-xs text-[var(--text-secondary)] truncate mono flex items-center gap-1.5">
            <Icon icon="tabler:id" class="text-xs opacity-60" />
            {{ channel.config?.appId || '-' }}
          </div>
        </div>
        <span class="badge badge-sm badge-soft-primary shrink-0">
          {{ channel.type === 'wechat' ? '微信' : channel.type === 'work_wechat' ? '企业微信' : channel.type === 'dingtalk' ? '钉钉' : channel.type === 'feishu' ? '飞书' : channel.type }}
        </span>
      </div>
    </div>

    <div v-if="channels.length === 0" class="text-center py-16 text-[var(--text-muted)]">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
        <Icon icon="tabler:broadcast-off" class="text-3xl opacity-40" />
      </div>
      <p class="text-sm font-medium">暂无渠道</p>
      <p class="text-xs mt-1 opacity-60">点击上方按钮创建第一个渠道</p>
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
