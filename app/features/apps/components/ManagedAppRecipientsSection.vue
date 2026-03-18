<template>
  <section class="surface-panel p-5 sm:p-6">
    <div class="text-app text-sm font-semibold">接收者与绑定</div>
    <p class="mt-1.5 text-sm leading-[1.7] text-subtle">{{ recipientsHelp(app) }}</p>

    <WeChatBindPanel
      v-if="app.deliveryType === 'wechat'"
      class="mt-4"
      :bind-state="bindState"
      :loading="bindLoading"
      :recipient-count="app.recipientCount"
      :recipient-mode="app.recipientProfile.mode"
      @generate="emit('generate-bind')"
    />

    <div
      v-else
      class="surface-accent mt-4 rounded-[1.05rem] px-4 py-4 text-sm leading-[1.6]"
    >
      {{ app.deliveryType === 'work_wechat'
        ? '企业微信应用不需要单独绑定流程，消息会发送到已配置的 userIds / departmentIds。'
        : 'Webhook 应用无需绑定，发送请求会直接调用当前保存的机器人 webhook。' }}
    </div>

    <div class="mt-5 space-y-3">
      <template v-if="recipientsLoading">
        <div
          v-for="placeholder in 2"
          :key="placeholder"
          class="surface-inset px-4 py-4"
        >
          <div class="h-4 w-32 rounded-full bg-[var(--color-panel-strong)]" />
          <div class="mt-2 h-3.5 w-48 rounded-full bg-[var(--color-panel-strong)]" />
        </div>
      </template>

      <div
        v-for="recipient in recipients"
        :key="recipient.id"
        class="surface-inset flex items-start justify-between gap-3 px-4 py-4"
      >
        <div class="min-w-0">
          <div class="text-app text-sm font-semibold">{{ recipient.label }}</div>
          <div v-if="recipient.detail" class="mt-1 break-all text-sm text-subtle">{{ recipient.detail }}</div>
        </div>
        <button
          v-if="app.deliveryType === 'wechat'"
          class="button-danger px-3 py-2 text-sm"
          type="button"
          @click="emit('remove-recipient', recipient.id)"
        >
          移除
        </button>
      </div>

      <div
        v-if="!recipientsLoading && recipients.length === 0"
        class="rounded-[1.05rem] border border-dashed border-[var(--app-border-strong)] px-4 py-5 text-sm text-subtle"
      >
        {{ app.deliveryType === 'wechat'
          ? '还没有绑定接收者，可通过上方绑定码引导用户授权。'
          : '当前应用没有独立接收者列表，实际消息目标由应用配置决定。' }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AppRecipientView, BindCodeViewState, ManagedAppLiteDetail } from '~/types';
import WeChatBindPanel from './WeChatBindPanel.vue';
import { recipientsHelp } from '../utils';

defineProps<{
  app: ManagedAppLiteDetail;
  recipients: AppRecipientView[];
  recipientsLoading: boolean;
  bindState: BindCodeViewState | null;
  bindLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'generate-bind'): void;
  (e: 'remove-recipient', recipientId: string): void;
}>();
</script>
