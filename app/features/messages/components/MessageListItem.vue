<template>
  <button
    type="button"
    class="w-full px-3 py-2.5 text-left transition-colors"
  >
    <div
      :class="messageCardClass(item, active)"
      class="rounded-[1.15rem] border px-4 py-3.5 transition-colors"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span :class="messageDirectionBadge(item.direction)" class="badge-base">
              {{ messageDirectionLabel(item.direction) }}
            </span>
            <span class="badge-base badge-neutral">{{ messageTypeLabel(item.type) }}</span>
            <span :class="messageStateBadge(item.delivery.state)" class="badge-base">
              {{ messageStateLabel(item.delivery.state) }}
            </span>
          </div>

          <div class="text-app mt-2.5 line-clamp-2 text-sm font-semibold">{{ item.title }}</div>
          <div class="mt-1.5 line-clamp-2 text-sm leading-[1.6] text-subtle">{{ messageSnippet(item) }}</div>

          <div class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <span>{{ messageSourceLabel(item) }}</span>
            <span>{{ formatRelativeTime(item.createdAt) }}</span>
            <span v-if="item.direction === 'outbound' && item.delivery.total > 0">
              {{ item.delivery.success }}/{{ item.delivery.total }} 成功
            </span>
          </div>
        </div>

        <div class="shrink-0 text-right text-[12px] leading-5 text-subtle">
          {{ formatMessageDateTime(item.createdAt) }}
        </div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { MessageListItem } from '~/types';
import {
  formatMessageDateTime,
  formatRelativeTime,
  messageCardClass,
  messageDirectionBadge,
  messageDirectionLabel,
  messageSnippet,
  messageSourceLabel,
  messageStateBadge,
  messageStateLabel,
  messageTypeLabel,
} from '../utils';

defineProps<{
  item: MessageListItem;
  active: boolean;
}>();
</script>
