<template>
  <section class="surface-panel-strong flex h-full min-h-0 flex-col overflow-hidden">
    <template v-if="activeItem">
      <div class="border-b border-[var(--app-border)] px-6 py-5">
        <div class="flex flex-wrap items-center gap-2">
          <span :class="messageDirectionBadge(activeItem.direction)" class="badge-base">
            {{ messageDirectionLabel(activeItem.direction) }}
          </span>
          <span class="badge-base badge-neutral">{{ messageTypeLabel(activeItem.type) }}</span>
          <span :class="messageStateBadge(deliverySummary.state)" class="badge-base">
            {{ messageStateLabel(deliverySummary.state) }}
          </span>
          <span v-if="activeItem.contentFormat" class="badge-base badge-neutral">{{ messageFormatLabel(activeItem) }}</span>
        </div>

        <h2 class="text-app mt-3 text-[1.15rem] font-semibold leading-8 tracking-[-0.02em]">{{ activeItem.title }}</h2>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle">
          <span>{{ messageSourceLabel(activeItem) }}</span>
          <span>{{ formatMessageDateTime(activeItem.createdAt) }}</span>
          <span v-if="detailLoading" class="inline-flex items-center gap-1.5">
            <AppIcon name="refresh" :size="14" class="animate-spin" />
            <span>加载详情中</span>
          </span>
        </div>
      </div>

      <div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <section class="surface-inset px-4 py-4">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">内容预览</div>
          <div class="mt-3 whitespace-pre-wrap text-sm leading-7 text-app-muted">
            {{ previewText }}
          </div>
        </section>

        <section class="surface-inset px-4 py-4">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">跳转与富内容</div>
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              v-if="message?.detailPageUrl"
              :href="message.detailPageUrl"
              target="_blank"
              rel="noreferrer"
              class="button-secondary text-sm"
            >
              <AppIcon name="link" :size="15" />
              <span>打开详情页</span>
            </a>
          </div>
          <div class="mt-3 grid gap-2 text-sm text-subtle">
            <div>格式：{{ messageFormatLabel(activeItem) }}</div>
            <div>跳转策略：{{ jumpModeLabel }}</div>
          </div>
        </section>

        <MessageResultsPanel
          v-if="activeItem.direction === 'outbound'"
          :results="message?.results"
          :summary="deliverySummary"
        />

        <section class="surface-inset px-4 py-4">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">上下文元数据</div>
          <div class="mt-3 grid gap-2 text-sm text-subtle">
            <div>ID：<span class="mono">{{ activeItem.id }}</span></div>
            <div>渠道：<span class="mono">{{ activeItem.channelId }}</span></div>
            <div v-if="activeItem.appId">应用：<span class="mono">{{ activeItem.appId }}</span></div>
            <div v-if="activeItem.openId">OpenID：<span class="mono">{{ activeItem.openId }}</span></div>
            <div v-if="message?.userNickname">昵称：{{ message.userNickname }}</div>
          </div>
        </section>
      </div>
    </template>

    <MessagesBlankState v-else mode="preview" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MessageDetailView, MessageListItem } from '~/types';
import AppIcon from '~/shared/icons/AppIcon.vue';
import MessagesBlankState from './MessagesBlankState.vue';
import MessageResultsPanel from './MessageResultsPanel.vue';
import {
  formatMessageDateTime,
  messageDirectionBadge,
  messageDirectionLabel,
  messageFormatLabel,
  messageSourceLabel,
  messageStateBadge,
  messageStateLabel,
  messageTypeLabel,
} from '../utils';

const props = defineProps<{
  detailLoading: boolean;
  message: MessageDetailView | null;
  summary: MessageListItem | null;
}>();

const activeItem = computed(() => props.message || props.summary);
const previewText = computed(() => props.message?.previewText || props.summary?.previewText || '');
const deliverySummary = computed(() => props.message?.delivery || props.summary?.delivery || {
  total: 0,
  success: 0,
  failed: 0,
  state: 'received' as const,
});
const jumpModeLabel = computed(() => {
  const mode = props.message?.jumpMode || props.summary?.jumpMode || 'none';
  return {
    direct: '直跳外链',
    landing: '详情页承载',
    none: '不跳转',
  }[mode];
});
</script>
