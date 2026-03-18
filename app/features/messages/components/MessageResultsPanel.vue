<template>
  <section class="surface-inset px-4 py-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">投递结果</div>
        <div class="text-app mt-1 text-sm font-semibold">
          成功 {{ summary.success }} / {{ summary.total }}，失败 {{ summary.failed }}
        </div>
      </div>
      <span :class="messageStateBadge(summary.state)" class="badge-base">
        {{ messageStateLabel(summary.state) }}
      </span>
    </div>

    <div v-if="results?.length" class="mt-4 space-y-2.5">
      <div
        v-for="result in results"
        :key="result.openId"
        class="rounded-[0.9rem] border border-[var(--app-border)] bg-[var(--color-panel)] px-3.5 py-3"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="mono break-all text-sm text-app">{{ result.openId }}</div>
          <span :class="result.success ? 'badge-emerald' : 'badge-rose'" class="badge-base">
            {{ result.success ? '成功' : '失败' }}
          </span>
        </div>
        <div v-if="result.error" class="mt-1.5 text-sm leading-[1.55] text-subtle">{{ result.error }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DeliveryResult, MessageDeliverySummary } from '~/types';
import { messageStateBadge, messageStateLabel } from '../utils';

defineProps<{
  results?: DeliveryResult[];
  summary: MessageDeliverySummary;
}>();
</script>
