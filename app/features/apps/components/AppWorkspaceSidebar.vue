<template>
  <div class="surface-panel flex h-full min-h-0 flex-col overflow-hidden">
    <div class="border-b border-[var(--app-border)] px-4 py-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
            应用目录
          </div>
          <div class="text-app mt-1 text-sm font-semibold tracking-[-0.02em]">
            按名称或类型筛选
          </div>
        </div>
        <span class="badge-base badge-neutral">{{ apps.length }} 个</span>
      </div>

      <div class="mt-4 grid gap-2.5">
        <div class="relative">
          <AppIcon
            name="search"
            :size="16"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
          />
          <input
            v-model.trim="searchQuery"
            type="text"
            class="input-base pl-10"
            placeholder="搜索应用名称或 send key"
          />
        </div>

        <select v-model="typeFilter" class="select-base">
          <option value="">全部类型</option>
          <option value="wechat">微信公众号</option>
          <option value="work_wechat">企业微信</option>
          <option value="dingtalk">钉钉 Webhook</option>
          <option value="feishu">飞书 Webhook</option>
        </select>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3 text-xs text-subtle">
        <span>{{ filteredApps.length }} / {{ apps.length }} 个应用</span>
        <span v-if="loading" class="inline-flex items-center gap-1.5">
          <AppIcon name="refresh" :size="13" class="animate-spin" />
          <span>刷新中</span>
        </span>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <div v-if="loading && apps.length === 0" class="flex min-h-[14rem] items-center justify-center gap-2 text-sm text-subtle">
          <AppIcon name="refresh" :size="16" class="animate-spin" />
          <span>正在加载应用…</span>
        </div>

        <div
          v-else-if="apps.length === 0"
          class="rounded-[1.2rem] border border-dashed border-[var(--app-border-strong)] px-4 py-8 text-center"
        >
          <div class="empty-state-icon mx-auto flex size-12 items-center justify-center rounded-[1.1rem]">
            <AppIcon name="apps" :size="20" />
          </div>
          <div class="text-app mt-4 text-sm font-semibold">还没有应用</div>
          <p class="mt-1.5 text-sm leading-[1.55] text-subtle">
            使用上方按钮创建第一个应用后，这里会成为日常切换入口。
          </p>
        </div>

        <div
          v-else-if="filteredApps.length === 0"
          class="rounded-[1.2rem] border border-dashed border-[var(--app-border-strong)] px-4 py-8 text-center"
        >
          <div class="surface-inset mx-auto flex size-12 items-center justify-center rounded-[1.1rem] text-subtle">
            <AppIcon name="search" :size="20" />
          </div>
          <div class="text-app mt-4 text-sm font-semibold">没有匹配的应用</div>
          <p class="mt-1.5 text-sm leading-[1.55] text-subtle">
            试试清空搜索词，或切回全部类型。
          </p>
        </div>

        <div v-else class="space-y-2.5">
          <button
            v-for="app in filteredApps"
            :key="app.id"
            :class="[
              'w-full rounded-[1.15rem] border px-3 py-3 text-left transition-colors',
              selectedAppId === app.id
                ? 'border-[color:color-mix(in_srgb,var(--color-accent)_26%,transparent)] bg-[var(--color-accent-soft)] shadow-[var(--shadow-panel-soft)]'
                : 'border-[var(--app-border)] bg-[var(--color-panel-inset)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-panel-strong)]',
            ]"
            type="button"
            @click="selectApp(app.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <ChannelIcon :type="app.deliveryType" :size="18" />
                  <div class="text-app min-w-0 truncate text-sm font-semibold">
                    {{ app.name }}
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span class="badge-base badge-neutral">{{ deliveryLabel(app.deliveryType) }}</span>
                  <span
                    :class="app.connectionMode === 'inline_webhook' ? 'badge-cyan' : 'badge-amber'"
                    class="badge-base"
                  >
                    {{ app.connectionMode === 'inline_webhook' ? '直接 webhook' : '认证配置' }}
                  </span>
                </div>
              </div>

              <div class="text-right text-[12px] leading-5 text-subtle">
                <div class="font-medium text-app-muted">{{ messageProfileLabel(app.deliveryType, app.messageProfile) }}</div>
                <div>{{ app.recipientCount }} 个接收者</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeliveryType } from '~/types';
import { useAppWorkspaceSidebar } from '~/composables/useAppWorkspaceSidebar';
import AppIcon from '~/shared/icons/AppIcon.vue';
import ChannelIcon from '~/shared/icons/ChannelIcon.vue';
import { messageProfileLabel } from '../utils';

const {
  apps,
  filteredApps,
  loading,
  searchQuery,
  selectApp,
  selectedAppId,
  typeFilter,
} = useAppWorkspaceSidebar();

function deliveryLabel(type: DeliveryType) {
  return {
    wechat: '微信公众号',
    work_wechat: '企业微信',
    dingtalk: '钉钉 Webhook',
    feishu: '飞书 Webhook',
  }[type];
}

</script>
