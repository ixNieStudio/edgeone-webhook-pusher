<template>
  <div class="space-y-5">
    <PageContextBar
      title="设置"
      subtitle="管理后台登录令牌、全局限流和消息保留策略。"
      :tabs="settingsTabs"
    >
      <template #actions>
        <button class="button-secondary" type="button" :disabled="loading" @click="loadPage">
          <AppIcon name="refresh" :size="16" :class="loading ? 'animate-spin' : ''" />
          <span>刷新</span>
        </button>
      </template>
    </PageContextBar>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr),360px]">
      <section class="surface-panel-strong p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-app text-sm font-semibold">全局行为</div>
            <p class="mt-1.5 text-sm leading-[1.55] text-subtle">
              限流和保留策略对所有应用生效，建议保持简洁和可预期。
            </p>
          </div>
          <span class="badge-base badge-cyan">Admin API</span>
        </div>

        <div class="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label class="field-label" for="rate-limit">每分钟限流</label>
            <input id="rate-limit" v-model.number="form.rateLimit.perMinute" type="number" min="1" max="5000" class="input-base" />
          </div>
          <div>
            <label class="field-label" for="retention-days">消息保留天数</label>
            <input id="retention-days" v-model.number="form.retention.days" type="number" min="1" max="3650" class="input-base" />
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="button-primary" type="button" :disabled="saving" @click="saveConfig">
            <AppIcon name="check" :size="16" />
            <span>{{ saving ? '保存中…' : '保存系统配置' }}</span>
          </button>
        </div>
      </section>

      <section class="surface-panel p-6">
        <div class="text-app text-sm font-semibold">管理员令牌</div>
        <p class="mt-1.5 text-sm leading-[1.55] text-subtle">
          令牌只用于后台登录和 Admin API 鉴权。重置后旧令牌会立即失效。
        </p>

        <div class="surface-inset mt-5 p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">当前令牌</div>
          <div class="text-app mt-2.5 break-all text-sm font-medium mono">
            {{ maskedToken }}
          </div>
        </div>

        <div class="alert-warning mt-4 px-3.5 py-3.5 text-sm leading-[1.55]">
          建议在确认你能安全保存新令牌后再执行重置，避免多窗口同时失去后台访问能力。
        </div>

        <div class="mt-5 flex justify-end">
          <button class="button-danger" type="button" @click="confirmReset = true">
            <AppIcon name="key" :size="16" />
            <span>重置管理员令牌</span>
          </button>
        </div>
      </section>
    </div>

    <AppConfirmDialog
      :open="confirmReset"
      title="重置管理员令牌"
      description="确认后会立即生成新的管理员令牌，当前令牌将失效。这个操作不会影响 send URL，但会影响所有后台登录会话。"
      confirm-label="立即重置"
      @close="confirmReset = false"
      @confirm="resetToken"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { SystemConfig } from '~/types';
import { useConfigApi } from '~/composables/api/useConfigApi';
import { showToast } from '~/composables/useToast';
import { settingsTabs } from '~/features/settings/constants';
import AppIcon from '~/shared/icons/AppIcon.vue';
import AppConfirmDialog from '~/shared/ui/AppConfirmDialog.vue';
import PageContextBar from '~/shared/ui/PageContextBar.vue';

definePageMeta({
  layout: 'default',
});

const configApi = useConfigApi();

const loading = ref(false);
const saving = ref(false);
const confirmReset = ref(false);
const config = ref<SystemConfig | null>(null);

const form = reactive({
  rateLimit: {
    perMinute: 60,
  },
  retention: {
    days: 30,
  },
});

const maskedToken = computed(() => {
  const token = config.value?.adminToken || '';
  if (!token) return '尚未初始化';
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
});

async function loadPage() {
  loading.value = true;
  try {
    const configRes = await configApi.getConfig();

    if (configRes.data) {
      config.value = configRes.data;
      form.rateLimit.perMinute = configRes.data.rateLimit?.perMinute ?? 60;
      form.retention.days = configRes.data.retention?.days ?? 30;
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : '加载设置失败', 'error');
  } finally {
    loading.value = false;
  }
}

async function saveConfig() {
  saving.value = true;
  try {
    const response = await configApi.updateConfig({
      rateLimit: { perMinute: form.rateLimit.perMinute },
      retention: { days: form.retention.days },
    });

    config.value = response.data;
    showToast('系统配置已保存', 'success');
  } catch (error) {
    showToast(error instanceof Error ? error.message : '保存设置失败', 'error');
  } finally {
    saving.value = false;
  }
}

async function resetToken() {
  confirmReset.value = false;

  try {
    const response = await configApi.resetAdminToken();
    config.value = {
      ...(config.value as SystemConfig),
      adminToken: response.data.adminToken,
      updatedAt: new Date().toISOString(),
    };
    await navigator.clipboard.writeText(response.data.adminToken);
    showToast('新管理员令牌已生成并复制到剪贴板', 'success');
  } catch (error) {
    showToast(error instanceof Error ? error.message : '重置管理员令牌失败', 'error');
  }
}

onMounted(loadPage);
</script>
