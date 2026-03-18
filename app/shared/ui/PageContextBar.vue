<template>
  <section class="page-context-shell">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <h1 class="text-app text-[1.55rem] font-semibold tracking-[-0.03em]">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="mt-2 max-w-3xl text-[13px] leading-[1.7] text-subtle">
          {{ subtitle }}
        </p>
      </div>

      <div v-if="statusItems.length || $slots.actions" class="page-context-actions xl:justify-end">
        <div v-if="statusItems.length" class="page-context-status">
          <span
            v-for="item in statusItems"
            :key="item.label"
            :class="badgeClass(item.tone)"
            class="badge-base"
          >
            {{ item.label }}
          </span>
        </div>

        <div v-if="$slots.actions" class="page-context-actions">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <div
      v-if="tabs.length"
      class="page-context-tabbar"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        :class="route.path === tab.to ? 'page-context-tab-active' : 'page-context-tab-idle'"
        class="page-context-tab"
      >
        {{ tab.label }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from '#imports';

type ContextTone = 'neutral' | 'cyan' | 'amber' | 'emerald' | 'rose';

interface ContextStatusItem {
  readonly label: string;
  readonly tone?: ContextTone;
}

interface ContextTabItem {
  readonly label: string;
  readonly to: string;
}

const props = withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  statusItems?: readonly ContextStatusItem[];
  tabs?: readonly ContextTabItem[];
}>(), {
  subtitle: '',
  statusItems: () => [],
  tabs: () => [],
});

const route = useRoute();

const statusItems = computed(() => props.statusItems);
const tabs = computed(() => props.tabs);

function badgeClass(tone: ContextTone = 'neutral') {
  return {
    neutral: 'badge-neutral',
    cyan: 'badge-cyan',
    amber: 'badge-amber',
    emerald: 'badge-emerald',
    rose: 'badge-rose',
  }[tone];
}
</script>
