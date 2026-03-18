<template>
  <main class="min-h-screen px-4 py-8 text-[14px] text-[var(--color-text)] sm:px-6">
    <div class="mx-auto max-w-4xl space-y-5">
      <header class="surface-panel-strong overflow-hidden p-6 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="brand-badge-surface rounded-[1.1rem] border border-[var(--app-border)] p-2.5 shadow-[var(--shadow-panel-soft)]">
              <img src="/logo.png" alt="EdgeOne MCP Pusher" class="size-9 object-contain" />
            </div>
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">Message Detail</div>
              <div class="mt-1 text-sm text-subtle">公开消息详情页</div>
            </div>
          </div>
          <a href="/admin/apps" class="button-secondary">
            返回控制台
          </a>
        </div>

        <div class="mt-6">
          <h1 class="text-app text-[1.9rem] font-semibold tracking-[-0.04em] sm:text-[2.4rem]">
            {{ detail?.title || '加载中…' }}
          </h1>
        </div>

        <div v-if="detail" class="mt-4 flex flex-wrap gap-2.5">
          <span class="badge-base badge-cyan">{{ formatLabel(detail.contentFormat) }}</span>
          <span class="badge-base badge-neutral">{{ formatDateTime(detail.createdAt) }}</span>
          <span v-if="detail.appName" class="badge-base badge-neutral">{{ detail.appName }}</span>
        </div>

        <p v-if="detail?.summary" class="mt-5 max-w-3xl text-sm leading-8 text-subtle">
          {{ detail.summary }}
        </p>
      </header>

      <section v-if="pending" class="surface-panel p-6">
        <div class="text-sm text-subtle">正在加载详情内容…</div>
      </section>

      <section v-else-if="error" class="surface-panel p-6">
        <div class="text-app text-lg font-semibold">消息详情不存在</div>
        <p class="mt-2 text-sm leading-[1.7] text-subtle">
          当前详情页链接无效、已过期，或对应消息已经被系统清理。
        </p>
      </section>

      <section v-else-if="detail" class="surface-panel p-6 sm:p-8">
        <div class="flex flex-wrap gap-2 border-b border-[var(--app-border)] pb-5">
          <span class="badge-base badge-cyan">系统详情页</span>
          <span class="badge-base badge-neutral">免鉴权访问</span>
          <span class="badge-base badge-neutral">由当前消息自动生成</span>
        </div>

        <div class="prose prose-slate mt-6 max-w-none dark:prose-invert [&_a]:text-[var(--color-accent)]" v-html="detail.renderedHtml"></div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ApiResponse, PublicMessageDetail } from '~/types';

definePageMeta({
  layout: false,
});

const route = useRoute();
const token = computed(() => route.params.token as string);

const { data, pending, error } = await useAsyncData(`public-message-${token.value}`, async () => {
  const response = await $fetch<ApiResponse<PublicMessageDetail>>(`/v1/public/messages/${token.value}`);
  return response.data;
});

const detail = computed(() => data.value || null);

function formatLabel(_value: PublicMessageDetail['contentFormat']) {
  return '网页';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
</script>
