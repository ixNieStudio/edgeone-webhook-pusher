<template>
  <section class="surface-panel-strong p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="text-app flex items-center gap-2 text-sm font-semibold">
          <AppIcon name="bolt" :size="16" class="text-[var(--color-accent)]" />
          <span>部署健康</span>
        </div>
        <p class="mt-1.5 text-sm leading-[1.7] text-subtle">
          检查 EdgeOne Pages 的环境变量、KV 绑定和初始化状态，确保后台与 send 兼容链路稳定可用。
        </p>
      </div>
      <button v-if="showRefresh" class="button-secondary" type="button" :disabled="loading" @click="$emit('refresh')">
        <AppIcon name="refresh" :size="16" :class="loading ? 'animate-spin' : ''" />
        <span>刷新</span>
      </button>
    </div>

    <div v-if="error" class="mt-4 rounded-xl border border-[color:var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-4 py-3.5 text-sm text-[var(--color-danger)]">
      {{ error }}
    </div>

    <div v-else-if="health" class="mt-5 space-y-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="metric-card p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">健康状态</div>
          <div class="text-app mt-2 text-xl font-semibold">
            {{ health.healthy ? '通过' : '异常' }}
          </div>
        </div>
        <div class="metric-card p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">初始化</div>
          <div class="text-app mt-2 text-xl font-semibold">
            {{ health.kv.systemConfig?.initialized ? '已完成' : '待初始化' }}
          </div>
        </div>
        <div class="metric-card p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">错误</div>
          <div class="text-app mt-2 text-xl font-semibold">
            {{ health.summary.errorCount }}
          </div>
        </div>
        <div class="metric-card p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">警告</div>
          <div class="text-app mt-2 text-xl font-semibold">
            {{ health.summary.warningCount }}
          </div>
        </div>
      </div>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)]">
        <div class="space-y-4">
          <div class="text-app text-sm font-semibold">建议操作</div>
          <div
            v-for="item in actionItems"
            :key="item.key"
            :class="[
              'rounded-[1.1rem] border px-4 py-4',
              item.tone === 'danger'
                ? 'alert-danger'
                : item.tone === 'warning'
                  ? 'alert-warning'
                  : 'alert-success',
            ]"
          >
            <div class="font-semibold">{{ item.title }}</div>
            <p class="mt-1 text-sm leading-[1.55] opacity-90">{{ item.description }}</p>
          </div>
        </div>

        <div class="grid gap-5">
          <div class="surface-inset p-4">
            <div class="text-app text-sm font-semibold">环境变量</div>
            <div class="mt-2.5 space-y-2.5">
              <div
                v-for="item in envItems"
                :key="item.key"
              class="surface-panel px-3.5 py-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-app text-sm font-semibold">{{ item.label }}</div>
                    <div class="mt-0.5 text-sm text-subtle">{{ item.description }}</div>
                  </div>
                  <span :class="item.ok ? 'badge-emerald' : 'badge-rose'" class="badge-base">
                    {{ item.ok ? '正常' : '缺失' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="surface-inset p-4">
            <div class="text-app text-sm font-semibold">KV 绑定</div>
            <div class="mt-2.5 space-y-2.5">
              <div
                v-for="item in kvItems"
                :key="item.key"
              class="surface-panel px-3.5 py-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-app text-sm font-semibold">{{ item.label }}</div>
                    <div class="mt-0.5 text-sm text-subtle">{{ item.description }}</div>
                  </div>
                  <span :class="item.ok ? 'badge-emerald' : 'badge-rose'" class="badge-base">
                    {{ item.ok ? '正常' : '异常' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="migration?.legacy?.hasData"
        class="rounded-[1rem] border border-[color:var(--color-warning-soft)] bg-[var(--color-warning-soft)] px-4 py-4 text-sm leading-[1.6] text-[var(--color-warning)]"
      >
        检测到旧 KV namespace 中仍有历史数据。新后台已做运行时兼容读取，但建议保留迁移窗口并避免再创建旧版资源。
      </div>
    </div>

    <div v-else class="mt-5 text-sm text-subtle">
      暂未读取到部署健康信息。
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HealthResponse, MigrationHealthResponse } from '~/types';
import AppIcon from '~/shared/icons/AppIcon.vue';

interface HealthListItem {
  key: string;
  label: string;
  ok: boolean;
  description: string;
}

interface HealthActionItem {
  key: string;
  title: string;
  description: string;
  tone: 'danger' | 'warning' | 'success';
}

withDefaults(defineProps<{
  loading: boolean;
  error: string;
  health: HealthResponse | null;
  migration: MigrationHealthResponse | null;
  envItems: HealthListItem[];
  kvItems: HealthListItem[];
  actionItems: HealthActionItem[];
  showRefresh?: boolean;
}>(), {
  showRefresh: true,
});

defineEmits<{
  (e: 'refresh'): void;
}>();
</script>
