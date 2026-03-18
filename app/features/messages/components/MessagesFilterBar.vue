<template>
  <div class="border-b border-[var(--app-border)] px-4 py-4">
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="option in directionOptions"
        :key="option.value"
        type="button"
        :class="directionFilter === option.value ? 'nav-pill-active' : 'nav-pill-idle'"
        class="rounded-[0.85rem] px-3.5 py-2 text-[13px] font-semibold transition-colors"
        @click="emit('update:directionFilter', option.value)"
      >
        {{ option.label }}
      </button>

      <div class="mx-1 hidden h-5 w-px bg-[var(--app-border)] lg:block" />

      <button
        v-for="preset in dateOptions"
        :key="preset.value"
        type="button"
        :class="datePreset === preset.value ? 'badge-cyan' : 'badge-neutral'"
        class="badge-base"
        @click="emit('update:datePreset', preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div class="mt-4 grid gap-3">
      <select
        :value="appFilter"
        class="select-base"
        @change="emit('update:appFilter', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">全部应用</option>
        <option v-for="app in apps" :key="app.id" :value="app.id">{{ app.name }}</option>
      </select>

      <div>
        <label class="field-label" for="messages-quick-filter">关键字</label>
        <div class="relative mt-2">
          <AppIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            id="messages-quick-filter"
            :value="quickFilter"
            type="text"
            class="input-base pl-10"
            placeholder="快速过滤当前列表"
            @input="emit('update:quickFilter', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <button class="button-secondary justify-center" type="button" :disabled="refreshing" @click="emit('refresh')">
        <AppIcon name="refresh" :size="16" :class="refreshing ? 'animate-spin' : ''" />
        <span>刷新消息</span>
      </button>

      <div class="text-xs leading-5 text-subtle">
        关键字只会过滤当前页已加载的消息，不会发起全历史搜索。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageFilterAppItem } from '~/types';
import AppIcon from '~/shared/icons/AppIcon.vue';

defineProps<{
  apps: MessageFilterAppItem[];
  directionFilter: 'all' | 'outbound' | 'inbound';
  appFilter: string;
  datePreset: 'all' | '24h' | '7d' | '30d';
  quickFilter: string;
  refreshing: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'update:directionFilter', value: 'all' | 'outbound' | 'inbound'): void;
  (e: 'update:appFilter', value: string): void;
  (e: 'update:datePreset', value: 'all' | '24h' | '7d' | '30d'): void;
  (e: 'update:quickFilter', value: string): void;
}>();

const directionOptions = [
  { label: '全部', value: 'all' },
  { label: '发出', value: 'outbound' },
  { label: '收到', value: 'inbound' },
] as const;

const dateOptions = [
  { label: '全部', value: 'all' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
] as const;
</script>
