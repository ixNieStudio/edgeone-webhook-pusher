<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div v-if="loading" class="flex min-h-[18rem] items-center justify-center gap-3 text-sm text-subtle">
      <AppIcon name="refresh" :size="16" class="animate-spin" />
      <span>正在加载消息记录…</span>
    </div>

    <MessagesBlankState v-else-if="items.length === 0" mode="list" />

    <template v-else>
      <div class="min-h-0 flex-1 overflow-y-auto py-2">
        <MessageListItem
          v-for="item in items"
          :key="item.id"
          :item="item"
          :active="item.id === selectedId"
          @click="emit('select', item.id)"
        />
      </div>

      <div v-if="pagination.totalPages > 1" class="border-t border-[var(--app-border)] px-4 py-3.5">
        <div class="flex items-center justify-between gap-3 text-xs text-subtle">
          <div>第 {{ pagination.page }} / {{ pagination.totalPages }} 页 · 共 {{ pagination.total }} 条</div>
          <div class="flex gap-2">
            <button
              class="button-secondary px-3 py-2 text-xs"
              type="button"
              :disabled="pagination.page <= 1"
              @click="emit('page', pagination.page - 1)"
            >
              上一页
            </button>
            <button
              class="button-secondary px-3 py-2 text-xs"
              type="button"
              :disabled="pagination.page >= pagination.totalPages"
              @click="emit('page', pagination.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { MessageListItem as MessageListEntry } from '~/types';
import AppIcon from '~/shared/icons/AppIcon.vue';
import MessageListItem from './MessageListItem.vue';
import MessagesBlankState from './MessagesBlankState.vue';

defineProps<{
  items: MessageListEntry[];
  loading: boolean;
  selectedId: string;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}>();

const emit = defineEmits<{
  (e: 'page', page: number): void;
  (e: 'select', id: string): void;
}>();
</script>
