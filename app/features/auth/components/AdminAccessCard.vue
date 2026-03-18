<template>
  <section class="surface-panel-strong flex w-full flex-col gap-4 self-start p-5 sm:p-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="brand-eyebrow text-xs font-semibold uppercase tracking-[0.2em]">
          EdgeOne Admin Access
        </div>
        <h2 class="text-app mt-1.5 text-[1.9rem] font-semibold tracking-[-0.04em]">
          {{ initialized ? '登录控制台' : (generatedToken ? '保存管理令牌' : '首次初始化') }}
        </h2>
        <p class="mt-2 text-sm leading-7 text-subtle">
          {{ initialized
            ? '输入管理员令牌即可进入后台，外部 send URL 会保持兼容。'
            : generatedToken
              ? '初始化成功后请先复制并保存管理员令牌，再进入后台。'
              : '如果摘要里存在阻塞项，建议先修复后再执行初始化。' }}
        </p>
      </div>
      <span :class="healthBadgeClass" class="badge-base">
        {{ healthBadgeText }}
      </span>
    </div>

    <div class="surface-inset px-4 py-4">
      <div class="flex items-start gap-3">
        <div class="empty-state-icon mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl">
          <AppIcon name="key" :size="18" />
        </div>
        <div>
          <div class="text-app text-sm font-semibold">管理员令牌仅用于后台</div>
          <p class="mt-1 text-[13px] leading-6 text-subtle">
            令牌会保存在当前浏览器本地。Webhook 类应用无需绑定流程，登录后直接创建即可。
          </p>
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <div v-if="checkingInit" class="metric-card flex items-center justify-center gap-3 p-6 text-sm text-subtle">
        <AppIcon name="refresh" :size="16" class="animate-spin" />
        <span>正在检查初始化状态…</span>
      </div>

      <template v-else-if="!initialized">
        <div v-if="!generatedToken" class="space-y-4">
          <div
            v-if="hasBlockingIssues"
            class="alert-warning px-3.5 py-3.5 text-sm leading-[1.55]"
          >
            当前部署检查仍有阻塞项，建议先处理左侧摘要中的问题后再初始化。
          </div>

          <button class="button-primary w-full" type="button" :disabled="initializing || hasBlockingIssues" @click="emit('initialize')">
            <AppIcon name="rocket" :size="16" />
            <span>{{ initializing ? '初始化中…' : '开始初始化' }}</span>
          </button>
        </div>

        <div v-else class="space-y-4">
          <div class="alert-success px-3.5 py-3.5 text-sm leading-[1.55]">
            初始化成功。请复制管理员令牌并妥善保存。
          </div>

          <div>
            <label class="field-label" for="generated-token">管理员令牌</label>
            <input
              id="generated-token"
              type="password"
              :value="generatedToken"
              readonly
              spellcheck="false"
              class="input-base mono"
            />
          </div>

          <div class="grid gap-2.5 sm:grid-cols-2">
            <button class="button-secondary" type="button" @click="emit('copy-generated-token')">
              <AppIcon name="copy" :size="16" />
              <span>复制令牌</span>
            </button>
            <button class="button-primary" type="button" @click="emit('save-and-enter')">
              <AppIcon name="chevron-right" :size="16" />
              <span>进入后台</span>
            </button>
          </div>
        </div>
      </template>

      <form v-else class="space-y-4" @submit.prevent="emit('login')">
        <div>
          <label class="field-label" for="token">管理员令牌</label>
          <input
            id="token"
            :value="tokenInput"
            type="password"
            class="input-base mono"
            placeholder="粘贴管理员令牌"
            autocomplete="current-password"
            spellcheck="false"
            @input="emit('update:tokenInput', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div
          v-if="loginError"
          class="alert-danger px-3.5 py-3.5 text-sm leading-[1.55]"
        >
          {{ loginError }}
        </div>

        <button class="button-primary w-full" type="submit" :disabled="submitting || !tokenInput">
          <AppIcon name="key" :size="16" />
          <span>{{ submitting ? '登录中…' : '进入控制台' }}</span>
        </button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '~/shared/icons/AppIcon.vue';

defineProps<{
  checkingInit: boolean;
  initialized: boolean;
  initializing: boolean;
  generatedToken: string;
  hasBlockingIssues: boolean;
  tokenInput: string;
  submitting: boolean;
  loginError: string;
  healthBadgeClass: string;
  healthBadgeText: string;
}>();

const emit = defineEmits<{
  (e: 'initialize'): void;
  (e: 'copy-generated-token'): void;
  (e: 'save-and-enter'): void;
  (e: 'login'): void;
  (e: 'update:tokenInput', value: string): void;
}>();
</script>
