<template>
  <article class="surface-panel-strong p-5 sm:p-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <ChannelIcon :type="profile.type" :size="24" class="rounded-[0.95rem]" />
          <h2 class="text-app text-lg font-semibold tracking-[-0.02em]">{{ profile.name }}</h2>
          <span :class="profile.type === 'wechat' ? 'badge-cyan' : 'badge-neutral'" class="badge-base">
            {{ profile.type === 'wechat' ? '微信公众号' : '企业微信' }}
          </span>
        </div>
        <p class="mt-2 text-sm leading-[1.65] text-subtle">
          {{ profile.type === 'wechat'
            ? '用于公众号 access_token 获取、二维码绑定和模板消息发送。'
            : '用于企业微信 token 获取和应用消息发送。' }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            :class="profile.maintenanceSnapshot.status === 'healthy'
              ? 'badge-emerald'
              : profile.maintenanceSnapshot.status === 'warning'
                ? 'badge-amber'
                : profile.maintenanceSnapshot.status === 'error'
                  ? 'badge-rose'
                  : 'badge-neutral'"
            class="badge-base"
          >
            {{ maintenanceLabel(profile.maintenanceSnapshot.status) }}
          </span>
          <span class="badge-base badge-neutral">引用 {{ profile.usageCount }} 个应用</span>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="button-secondary" type="button" @click="emit('detail', profile.id)">
          <AppIcon name="eye" :size="16" />
          <span>查看维护详情</span>
        </button>
        <button class="button-secondary" type="button" @click="emit('edit', profile)">
          <AppIcon name="settings" :size="16" />
          <span>编辑</span>
        </button>
      </div>
    </div>

    <div class="mt-5 grid gap-3">
      <div
        v-for="(value, key) in profile.config"
        :key="`${profile.id}-${key}`"
        class="surface-inset px-3.5 py-3.5"
      >
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">{{ key }}</div>
        <div class="text-app mt-1.5 break-all text-sm font-medium">
          {{ typeof value === 'number' ? value : String(value) }}
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { AuthProfileSummary } from '~/types';
import AppIcon from '~/shared/icons/AppIcon.vue';
import ChannelIcon from '~/shared/icons/ChannelIcon.vue';

defineProps<{
  profile: AuthProfileSummary;
}>();

const emit = defineEmits<{
  (e: 'detail', profileId: string): void;
  (e: 'edit', profile: AuthProfileSummary): void;
}>();

function maintenanceLabel(status: AuthProfileSummary['maintenanceSnapshot']['status']) {
  return {
    healthy: '维护正常',
    warning: '临近过期',
    error: '维护异常',
    unknown: '待检查',
  }[status];
}
</script>
