<template>
  <section class="surface-panel flex min-h-0 flex-col gap-3 p-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-app text-sm font-semibold">健康检查</div>
        <p class="mt-1 text-[13px] leading-5 text-subtle">
          登录后可在“设置 / 部署健康”查看完整报告。
        </p>
      </div>
      <button class="button-secondary px-3 py-2 text-xs" type="button" :disabled="loading" @click="emit('refresh')">
        <AppIcon name="refresh" :size="14" :class="loading ? 'animate-spin' : ''" />
        <span>刷新</span>
      </button>
    </div>

    <div class="grid gap-2.5 sm:grid-cols-3">
      <div
        v-for="item in summaryItems"
        :key="item.label"
        class="surface-inset px-3 py-3"
      >
        <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
          {{ item.label }}
        </div>
        <div :class="healthValueClass(item.tone)" class="mt-1.5 text-sm font-semibold">
          {{ item.value }}
        </div>
      </div>
    </div>

    <div v-if="error" class="alert-danger rounded-[0.9rem] px-3 py-2.5 text-sm leading-[1.55]">
      {{ error }}
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="item in quickItems"
        :key="item.key"
        :class="quickHealthItemClass(item.tone)"
        class="rounded-[1rem] border px-3.5 py-3"
      >
        <div class="text-sm font-semibold">{{ item.title }}</div>
        <p class="mt-1 text-[13px] leading-5 opacity-90">{{ item.description }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '~/shared/icons/AppIcon.vue';

defineProps<{
  loading: boolean;
  error: string;
  summaryItems: Array<{
    label: string;
    value: string;
    tone: 'success' | 'warning' | 'neutral';
  }>;
  quickItems: Array<{
    key: string;
    title: string;
    description: string;
    tone: 'danger' | 'warning' | 'success';
  }>;
  healthValueClass: (tone: 'success' | 'warning' | 'neutral') => string;
  quickHealthItemClass: (tone: 'danger' | 'warning' | 'success') => string;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
}>();
</script>
