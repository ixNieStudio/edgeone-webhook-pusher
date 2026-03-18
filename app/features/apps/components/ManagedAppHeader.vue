<template>
  <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--app-border)] pb-5">
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <ChannelIcon :type="app.deliveryType" :size="30" class="rounded-[1rem]" />
        <h2 class="text-app text-[1.45rem] font-semibold tracking-[-0.03em]">{{ app.name }}</h2>
        <span :class="deliveryBadgeClass(app.deliveryType)" class="badge-base channel-tone">
          {{ deliveryLabel(app.deliveryType) }}
        </span>
        <span :class="messageProfileBadgeClass(app.deliveryType, app.messageProfile)" class="badge-base">
          {{ messageProfileLabel(app.deliveryType, app.messageProfile) }}
        </span>
        <span
          v-if="app.legacy.usesLegacyChannel || app.legacy.usesInlineWebhookFallback"
          class="badge-base badge-amber"
        >
          兼容旧配置
        </span>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2.5 text-sm leading-none">
          <span :class="recipientBadgeClass(app.recipientProfile.mode)" class="badge-base">
            <span class="opacity-70">接收者</span>
            <span>{{ recipientModeLabel(app.recipientProfile.mode) }}</span>
          </span>

          <template v-if="app.connectionMode === 'auth_profile_ref' && app.authProfileId">
            <button
              :class="deliveryBadgeClass(app.deliveryType)"
              class="badge-base channel-tone inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
              type="button"
              @click="emit('open-auth-profile', app.authProfileId)"
            >
              <span class="opacity-70">认证配置</span>
              <span>{{ app.authProfileName || app.authProfileId }}</span>
              <AppIcon name="eye" :size="14" />
            </button>
            <span
              v-if="app.maintenanceSnapshot"
              :class="maintenanceBadgeClass(app.maintenanceSnapshot)"
              class="badge-base"
            >
              {{ maintenanceLabel(app.maintenanceSnapshot) }}
            </span>
            <span class="badge-base badge-neutral max-w-full break-words">{{ authProfileMaintenanceSummary }}</span>
          </template>
      </div>

      <div
        v-if="app.connectionMode === 'auth_profile_ref' && app.maintenanceSnapshot?.error"
        :class="app.maintenanceSnapshot.status === 'warning' ? 'alert-warning' : 'alert-danger'"
        class="mt-4 px-4 py-3.5 text-sm leading-[1.6]"
      >
        {{ app.maintenanceSnapshot.error }}
      </div>

      <div
        v-else-if="app.connectionMode === 'inline_webhook' && app.connectionDetail.status === 'missing'"
        class="alert-warning mt-4 px-4 py-3.5 text-sm leading-[1.6]"
      >
        当前应用的 webhook 连接信息不完整。建议编辑并重新保存一次，确保详情与实际发送配置一致。
      </div>
    </div>

    <div class="flex flex-wrap gap-2.5">
      <button class="button-secondary" type="button" :disabled="detailLoading" @click="emit('refresh')">
        <AppIcon name="refresh" :size="16" :class="detailLoading ? 'animate-spin' : ''" />
        <span>刷新详情</span>
      </button>
      <button class="button-secondary" type="button" @click="emit('edit')">
        <AppIcon name="settings" :size="16" />
        <span>编辑</span>
      </button>
      <button class="button-primary" type="button" @click="emit('test')">
        <AppIcon name="play" :size="16" />
        <span>测试发送</span>
      </button>
      <button class="button-danger" type="button" @click="emit('delete')">
        <AppIcon name="trash" :size="16" />
        <span>删除</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ManagedAppLiteDetail } from '~/types';
import AppIcon from '~/shared/icons/AppIcon.vue';
import ChannelIcon from '~/shared/icons/ChannelIcon.vue';
import {
  deliveryBadgeClass,
  deliveryLabel,
  maintenanceBadgeClass,
  maintenanceLabel,
  messageProfileBadgeClass,
  messageProfileLabel,
  recipientBadgeClass,
  recipientModeLabel,
} from '../utils';

defineProps<{
  app: ManagedAppLiteDetail;
  detailLoading: boolean;
  authProfileMaintenanceSummary: string;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'edit'): void;
  (e: 'test'): void;
  (e: 'delete'): void;
  (e: 'open-auth-profile', profileId: string): void;
}>();
</script>
