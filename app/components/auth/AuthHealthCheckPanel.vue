<template>
  <div class="card-glass card-md mt-6 animate-fade-in">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <Icon icon="tabler:heartbeat" class="text-base" />
        <span>健康检查</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          :disabled="healthChecking"
          @click="emit('refresh')"
        >
          <Icon v-if="healthChecking" icon="svg-spinners:ring-resize" />
          <Icon v-else icon="tabler:refresh" />
          刷新
        </button>
        <span v-if="healthChecking" class="text-xs text-[var(--text-muted)]">检查中...</span>
        <span
          v-else-if="healthData"
          class="badge badge-xs"
          :class="healthData.healthy ? 'badge-soft-success' : 'badge-soft-danger'"
        >
          {{ healthData.healthy ? '健康' : '异常' }}
        </span>
        <span v-else class="badge badge-xs badge-soft-neutral">未知</span>
      </div>
    </div>

    <div v-if="healthError" class="alert alert-danger text-xs mt-3">
      <Icon icon="tabler:alert-circle" class="shrink-0 text-base" />
      <span>{{ healthError }}</span>
    </div>

    <div v-else-if="healthData" class="mt-3 space-y-4 text-xs text-[var(--text-secondary)]">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="badge badge-xs"
          :class="healthData.ready ? 'badge-soft-success' : 'badge-soft-warning'"
        >
          {{ healthData.ready ? '已就绪' : '未就绪' }}
        </span>
        <span class="badge badge-xs badge-soft-neutral">
          环境 {{ healthEnvItems.length }}
        </span>
        <span class="badge badge-xs badge-soft-neutral">
          KV {{ healthKvBindingItems.length }}
        </span>
        <span>
          错误 {{ healthData.summary.errorCount }} · 警告 {{ healthData.summary.warningCount }}
        </span>
      </div>

      <div class="space-y-2">
        <div class="font-medium text-[var(--text-primary)]">建议操作</div>
        <div class="space-y-2">
          <div
            v-for="item in healthActionItems"
            :key="`health-action-${item.key}`"
            :class="['rounded-xl border p-3', getTonePanelClass(item.tone)]"
          >
            <div class="flex items-start gap-3">
              <Icon
                :icon="getToneIcon(item.tone)"
                class="mt-0.5 shrink-0 text-base"
                :class="getToneTextClass(item.tone)"
              />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-[var(--text-primary)]">{{ item.title }}</div>
                <p class="mt-1 leading-5 text-[var(--text-secondary)]">{{ item.description }}</p>
                <code
                  v-if="item.code"
                  class="mt-2 block overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] mono"
                >
                  {{ item.code }}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="font-medium text-[var(--text-primary)]">环境变量</div>
        <div class="space-y-2">
          <div
            v-for="item in healthEnvItems"
            :key="item.key"
            :class="['rounded-xl border p-3', getTonePanelClass(item.tone)]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="font-medium text-[var(--text-primary)]">{{ item.label }}</div>
                <p class="mt-1 leading-5 text-[var(--text-secondary)]">{{ item.description }}</p>
                <code
                  v-if="item.code"
                  class="mt-2 block overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] mono"
                >
                  {{ item.code }}
                </code>
              </div>
              <span class="badge badge-xs shrink-0" :class="getToneBadgeClass(item.tone)">{{ item.statusText }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="font-medium text-[var(--text-primary)]">KV 绑定</div>
        <div class="space-y-2">
          <div
            v-for="item in healthKvBindingItems"
            :key="item.key"
            :class="['rounded-xl border p-3', getTonePanelClass(item.tone)]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="font-medium text-[var(--text-primary)]">{{ item.label }}</div>
                <p class="mt-1 leading-5 text-[var(--text-secondary)]">{{ item.description }}</p>
              </div>
              <span class="badge badge-xs shrink-0" :class="getToneBadgeClass(item.tone)">{{ item.statusText }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="healthData.summary.errors.length || healthData.summary.warnings.length" class="space-y-3">
        <div v-if="healthData.summary.errors.length" class="space-y-1">
          <div class="text-[var(--danger-600)] font-medium">错误</div>
          <ul class="list-disc list-inside space-y-0.5">
            <li v-for="(item, index) in healthData.summary.errors" :key="`health-error-${index}`">
              {{ item }}
            </li>
          </ul>
        </div>

        <div v-if="healthData.summary.warnings.length" class="space-y-1">
          <div class="text-[var(--warning-600)] font-medium">警告</div>
          <ul class="list-disc list-inside space-y-0.5">
            <li v-for="(item, index) in healthData.summary.warnings" :key="`health-warning-${index}`">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="text-xs text-[var(--text-muted)] mt-3">无法获取健康状态</div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { HealthDisplayItem, HealthGuideItem, HealthResponse, HealthTone } from '~/types';

defineProps<{
  healthData: HealthResponse | null;
  healthChecking: boolean;
  healthError: string;
  healthEnvItems: HealthDisplayItem[];
  healthKvBindingItems: HealthDisplayItem[];
  healthActionItems: HealthGuideItem[];
  getToneBadgeClass: (tone: HealthTone) => string;
  getTonePanelClass: (tone: HealthTone) => string;
  getToneTextClass: (tone: HealthTone) => string;
  getToneIcon: (tone: HealthTone) => string;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
}>();
</script>
