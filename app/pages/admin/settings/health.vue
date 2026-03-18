<template>
  <div class="space-y-5">
    <PageContextBar
      title="设置"
      subtitle="查看 EdgeOne Pages 部署健康、历史 KV 兼容状态和上手路径。"
      :tabs="settingsTabs"
    >
      <template #actions>
        <button class="button-secondary" type="button" :disabled="loading" @click="refresh">
          <AppIcon name="refresh" :size="16" :class="loading ? 'animate-spin' : ''" />
          <span>刷新</span>
        </button>
      </template>
    </PageContextBar>

    <HealthOverviewCard
      :loading="loading"
      :error="error"
      :health="health"
      :migration="migration"
      :env-items="envItems"
      :kv-items="kvItems"
      :action-items="actionItems"
      :show-refresh="false"
    />

    <section class="surface-panel p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="text-app text-sm font-semibold">摘要索引</div>
          <p class="mt-1.5 text-sm leading-[1.55] text-subtle">
            apps 和认证配置列表优先走精准 key 摘要索引。这里可以查看索引版本、摘要数量，并在需要时主动修复。
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="button-secondary" type="button" :disabled="repairing" @click="repair('apps')">
            <AppIcon name="refresh" :size="16" :class="repairingDomain === 'apps' ? 'animate-spin' : ''" />
            <span>修复应用索引</span>
          </button>
          <button class="button-secondary" type="button" :disabled="repairing" @click="repair('auth_profiles')">
            <AppIcon name="refresh" :size="16" :class="repairingDomain === 'auth_profiles' ? 'animate-spin' : ''" />
            <span>修复认证索引</span>
          </button>
          <button class="button-primary" type="button" :disabled="repairing" @click="repair('all')">
            <AppIcon name="refresh" :size="16" :class="repairingDomain === 'all' ? 'animate-spin' : ''" />
            <span>全部修复</span>
          </button>
        </div>
      </div>

      <div v-if="overview?.indexes" class="mt-5 grid gap-4 lg:grid-cols-2">
        <div
          v-for="item in indexItems"
          :key="item.key"
          class="rounded-[1rem] border border-[var(--app-border)] px-4 py-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="text-app text-sm font-semibold">{{ item.title }}</div>
            <span :class="item.healthy ? 'badge-emerald' : 'badge-amber'" class="badge-base">
              {{ item.healthy ? '健康' : '待修复' }}
            </span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 text-sm">
            <span class="badge-base badge-neutral">版本 {{ item.version }}</span>
            <span class="badge-base badge-neutral">总量 {{ item.total }}</span>
            <span class="badge-base badge-neutral">摘要 {{ item.summaryCount }}</span>
            <span class="badge-base badge-neutral">修复 {{ item.lastRepairAt }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="surface-panel p-6">
      <div class="text-app flex items-center gap-2 text-sm font-semibold">
        <AppIcon name="sparkles" :size="16" class="text-[var(--color-accent)]" />
        <span>创建第一条通知</span>
      </div>

      <div v-if="overview?.onboarding?.length" class="mt-5 grid gap-4 lg:grid-cols-3">
        <div
          v-for="item in overview.onboarding"
          :key="item.key"
          :class="item.completed ? 'badge-emerald' : 'badge-neutral'"
          class="rounded-[1rem] border border-[var(--app-border)] px-3.5 py-3.5"
        >
          <div class="flex items-center gap-2 text-sm font-semibold">
            <AppIcon :name="item.completed ? 'check' : 'chevron-right'" :size="16" />
            <span>{{ item.title }}</span>
          </div>
          <p class="mt-1.5 text-sm leading-[1.55] text-subtle">{{ item.description }}</p>
        </div>
      </div>

      <div class="mt-5 rounded-[1rem] border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-4 py-4 text-app-muted text-sm leading-6">
        推荐路径：先在“应用”页创建一个 webhook 应用验证 send 链路，确认外部系统已打通后，再视需要接入公众号或企业微信认证配置。
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { SetupOverview } from '~/types';
import { useAppApi } from '~/composables/api/useAppApi';
import { showToast } from '~/composables/useToast';
import { settingsTabs } from '~/features/settings/constants';
import AppIcon from '~/shared/icons/AppIcon.vue';
import { useHealthChecks } from '~/shared/composables/useHealthChecks';
import HealthOverviewCard from '~/features/settings/components/HealthOverviewCard.vue';
import PageContextBar from '~/shared/ui/PageContextBar.vue';

definePageMeta({
  layout: 'default',
});

const appApi = useAppApi();
const overview = ref<SetupOverview | null>(null);
const repairingDomain = ref<'apps' | 'auth_profiles' | 'all' | ''>('');
const repairing = computed(() => Boolean(repairingDomain.value));

const indexItems = computed(() => {
  const indexes = overview.value?.indexes;
  if (!indexes) {
    return [];
  }

  return [
    {
      key: 'apps',
      title: '应用摘要索引',
      ...indexes.apps,
      lastRepairAt: indexes.apps.lastRepairAt || '未记录',
    },
    {
      key: 'auth_profiles',
      title: '认证配置摘要索引',
      ...indexes.authProfiles,
      lastRepairAt: indexes.authProfiles.lastRepairAt || '未记录',
    },
  ];
});

const {
  health,
  migration,
  loading,
  error,
  envItems,
  kvItems,
  actionItems,
  refresh,
} = useHealthChecks();

onMounted(async () => {
  await Promise.all([
    refresh(),
    appApi.getSetupOverview().then((response) => {
      overview.value = response.data || null;
    }),
  ]);
});

async function repair(domain: 'apps' | 'auth_profiles' | 'all') {
  repairingDomain.value = domain;
  try {
    const response = await appApi.repairIndexes(domain);
    if (overview.value && response.data?.indexes) {
      overview.value = {
        ...overview.value,
        indexes: response.data.indexes,
      };
    }
    showToast('索引修复完成', 'success');
    await Promise.all([
      refresh(),
      appApi.getSetupOverview().then((response) => {
        overview.value = response.data || null;
      }),
    ]);
  } catch (error) {
    showToast(error instanceof Error ? error.message : '索引修复失败', 'error');
  } finally {
    repairingDomain.value = '';
  }
}
</script>
