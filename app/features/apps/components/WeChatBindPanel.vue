<template>
  <section class="surface-inset p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <div class="empty-state-icon flex size-9 items-center justify-center rounded-[1rem]">
            <AppIcon name="link" :size="16" />
          </div>
          <div class="text-app text-sm font-semibold">绑定二维码</div>
        </div>
        <p class="mt-2 text-sm leading-[1.55] text-subtle">
          优先使用二维码扫码绑定；若当前公众号不支持二维码，则自动回退为发送绑定指令。
        </p>
      </div>
      <button
        class="button-primary"
        type="button"
        :disabled="loading || singleRecipientLocked"
        @click="emit('generate')"
      >
        <AppIcon name="link" :size="16" />
        <span>
          {{ loading ? '生成中…' : actionLabel }}
        </span>
      </button>
    </div>

    <div
      v-if="singleRecipientLocked && !bindState"
      class="alert-warning mt-4 px-3.5 py-3.5 text-sm leading-[1.55]"
    >
      当前应用使用单接收者模式，且已经绑定了 1 个用户。请先移除现有接收者，再生成新的绑定码。
    </div>

    <div
      v-else-if="!bindState"
        class="mt-4 rounded-[1.1rem] border border-dashed border-[var(--app-border-strong)] px-4 py-6"
    >
      <div class="flex flex-col items-center text-center">
        <div class="surface-accent flex size-12 items-center justify-center rounded-2xl">
          <AppIcon name="users" :size="20" />
        </div>
        <div class="text-app mt-4 text-sm font-semibold">还没有活动中的绑定码</div>
        <p class="mt-2 max-w-xl text-sm leading-[1.6] text-subtle">
          生成后会显示二维码、绑定指令和倒计时。用户关注公众号后扫码，或在聊天窗口发送 `绑定 XXXX1234` 即可完成授权。
        </p>
      </div>
    </div>

    <div v-else class="mt-4 space-y-4">
        <div class="surface-panel px-4 py-4">
          <div class="grid items-center gap-5 md:grid-cols-[208px,minmax(0,1fr)]">
            <div class="mx-auto">
            <div class="rounded-[1.25rem] border border-[var(--app-border)] bg-white p-3 shadow-[0_18px_36px_rgba(8,15,30,0.1)]">
              <img
                v-if="bindState.qrCodeUrl && bindState.status === 'pending'"
                :src="bindState.qrCodeUrl"
                alt="绑定二维码"
                class="size-[176px] rounded-[0.95rem] object-contain"
              />
              <div
                v-else
                class="flex size-[176px] flex-col items-center justify-center rounded-[0.95rem] border border-dashed border-[var(--app-border-strong)] px-4 text-center"
              >
                <AppIcon :name="bindState.status === 'bound' ? 'check' : 'link'" :size="24" class="text-subtle" />
                <div class="mt-3 text-sm font-semibold text-app">
                  {{ bindState.status === 'bound' ? '绑定已完成' : '发送绑定码完成授权' }}
                </div>
                <p class="mt-1 text-xs leading-[1.5] text-subtle">
                  {{ bindState.status === 'bound' ? '接收者已成功接入当前应用。' : '当前公众号若不支持二维码，可直接使用绑定指令。' }}
                </p>
              </div>
            </div>
          </div>

          <div class="min-w-0">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">BindCode</div>
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <div class="text-app text-[1.7rem] font-semibold tracking-[0.26em] mono">{{ bindState.code }}</div>
              <button class="icon-button shrink-0" type="button" @click="copyText(bindState.code, '绑定码')">
                <AppIcon name="copy" :size="16" />
              </button>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2.5">
              <span :class="statusBadgeClass" class="badge-base">{{ statusLabel }}</span>
              <span v-if="bindState.status === 'pending'" class="text-sm text-subtle">
                剩余 {{ remainingTimeText }}
              </span>
              <span v-else class="text-sm text-subtle">{{ statusDescription }}</span>
            </div>

            <div class="mt-4 text-sm leading-[1.65] text-subtle">
              <p v-if="bindState.qrCodeUrl && bindState.status === 'pending'">
                使用微信扫描左侧二维码即可进入绑定流程；如果尚未关注公众号，请先完成关注。
              </p>
              <p v-else-if="bindState.status === 'pending'">
                在公众号聊天窗口发送
                <code class="rounded bg-[var(--color-panel-strong)] px-1.5 py-0.5 mono">绑定 {{ bindState.code }}</code>
                完成授权。
              </p>
              <p v-else-if="bindState.status === 'bound'">
                页面已经检测到新的绑定结果，接收者列表会同步刷新。
              </p>
              <p v-else>
                当前绑定码已失效，请重新生成新的二维码或绑定指令。
              </p>
            </div>

            <div class="mt-4 flex flex-wrap gap-2.5">
              <button
                class="button-secondary"
                type="button"
                @click="copyText(`绑定 ${bindState.code}`, '绑定指令')"
              >
                <AppIcon name="copy" :size="16" />
                <span>复制绑定指令</span>
              </button>
              <button
                class="button-secondary"
                type="button"
                :disabled="loading || singleRecipientLocked"
                @click="emit('generate')"
              >
                <AppIcon name="refresh" :size="16" :class="loading ? 'animate-spin' : ''" />
                <span>{{ bindState.status === 'pending' ? '刷新绑定码' : '重新生成' }}</span>
              </button>
            </div>

            <div class="mt-4 text-xs leading-[1.65] text-subtle">
              <div v-if="bindState.status === 'pending'">失效时间：{{ expiresAtText }}</div>
              <div v-else-if="bindState.status === 'bound' && (bindState.nickname || bindState.openId)">
                已绑定用户：{{ bindState.nickname || '微信用户' }}
                <span v-if="bindState.openId" class="mono">({{ bindState.openId }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="singleRecipientLocked && bindState.status === 'bound'"
        class="alert-warning px-3.5 py-3.5 text-sm leading-[1.55]"
      >
        当前应用使用单接收者模式，已经绑定了一个用户。如需更换接收者，请先在下方移除现有绑定后再重新生成绑定码。
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { BindCodeViewState, RecipientMode } from '~/types';
import { showToast } from '~/composables/useToast';
import { formatDateTime } from '~/utils/datetime';
import AppIcon from '~/shared/icons/AppIcon.vue';

const props = defineProps<{
  bindState: BindCodeViewState | null;
  loading: boolean;
  recipientCount: number;
  recipientMode?: RecipientMode;
}>();

const emit = defineEmits<{
  (e: 'generate'): void;
}>();

const remainingTimeText = ref('即将过期');
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const singleRecipientLocked = computed(() => (
  props.recipientMode === 'single'
  && props.recipientCount > 0
  && props.bindState?.status !== 'pending'
));

const actionLabel = computed(() => {
  if (!props.bindState) return '生成绑定码';
  if (props.bindState.status === 'pending') return '刷新绑定码';
  return '重新生成';
});

const statusLabel = computed(() => {
  if (!props.bindState) return '未生成';
  return {
    pending: '等待绑定',
    bound: '绑定成功',
    expired: '已失效',
  }[props.bindState.status];
});

const statusBadgeClass = computed(() => {
  if (!props.bindState) return 'badge-neutral';
  return {
    pending: 'badge-cyan',
    bound: 'badge-emerald',
    expired: 'badge-amber',
  }[props.bindState.status];
});

const statusDescription = computed(() => {
  if (!props.bindState) return '还没有活动中的绑定码';
  if (props.bindState.status === 'pending') {
    return props.bindState.qrCodeUrl ? '等待用户扫码授权' : '等待用户发送绑定指令';
  }
  if (props.bindState.status === 'bound') return '接收者已接入当前应用';
  return '需要重新生成新的绑定码';
});

const expiresAtText = computed(() => formatDateTime(props.bindState?.expiresAt));

watch(
  () => [props.bindState?.status, props.bindState?.expiresAt],
  () => {
    if (props.bindState?.status === 'pending' && props.bindState.expiresAt) {
      startCountdown();
      return;
    }
    stopCountdown();
    remainingTimeText.value = props.bindState?.status === 'expired' ? '已过期' : '无需倒计时';
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopCountdown();
});

function startCountdown() {
  stopCountdown();
  updateRemainingTime();
  countdownTimer = setInterval(updateRemainingTime, 1000);
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function updateRemainingTime() {
  if (!props.bindState?.expiresAt || props.bindState.status !== 'pending') {
    remainingTimeText.value = '无需倒计时';
    stopCountdown();
    return;
  }

  const remaining = props.bindState.expiresAt - Date.now();
  if (remaining <= 0) {
    remainingTimeText.value = '已过期';
    stopCountdown();
    return;
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  remainingTimeText.value = `${minutes}:${String(seconds).padStart(2, '0')}`;
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  showToast(`${label}已复制`, 'success');
}
</script>
