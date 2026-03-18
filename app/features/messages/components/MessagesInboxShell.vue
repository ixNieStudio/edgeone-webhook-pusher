<template>
  <div class="messages-inbox-layout">
    <aside class="surface-panel-strong messages-inbox-list">
      <MessagesFilterBar
        :apps="apps"
        :direction-filter="directionFilter"
        :app-filter="appFilter"
        :date-preset="datePreset"
        :quick-filter="quickFilter"
        :refreshing="refreshing"
        @refresh="$emit('refresh')"
        @update:direction-filter="(value) => $emit('update:direction-filter', value)"
        @update:app-filter="(value) => $emit('update:app-filter', value)"
        @update:date-preset="(value) => $emit('update:date-preset', value)"
        @update:quick-filter="(value) => $emit('update:quick-filter', value)"
      />

      <MessagesList
        :items="items"
        :loading="loading"
        :selected-id="selectedId"
        :pagination="pagination"
        @page="(page) => $emit('page', page)"
        @select="(id) => $emit('select', id)"
      />
    </aside>

    <div class="messages-inbox-preview">
      <MessagePreviewPanel
        :detail-loading="detailLoading"
        :message="message"
        :summary="summary"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageDetailView, MessageFilterAppItem, MessageListItem } from '~/types';
import MessagePreviewPanel from './MessagePreviewPanel.vue';
import MessagesFilterBar from './MessagesFilterBar.vue';
import MessagesList from './MessagesList.vue';

defineProps<{
  apps: MessageFilterAppItem[];
  appFilter: string;
  datePreset: 'all' | '24h' | '7d' | '30d';
  detailLoading: boolean;
  directionFilter: 'all' | 'outbound' | 'inbound';
  items: MessageListItem[];
  loading: boolean;
  message: MessageDetailView | null;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
  quickFilter: string;
  refreshing: boolean;
  selectedId: string;
  summary: MessageListItem | null;
}>();

defineEmits<{
  (e: 'page', page: number): void;
  (e: 'refresh'): void;
  (e: 'select', id: string): void;
  (e: 'update:app-filter', value: string): void;
  (e: 'update:date-preset', value: 'all' | '24h' | '7d' | '30d'): void;
  (e: 'update:direction-filter', value: 'all' | 'outbound' | 'inbound'): void;
  (e: 'update:quick-filter', value: string): void;
}>();
</script>
