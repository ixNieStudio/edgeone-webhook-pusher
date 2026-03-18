import { computed, ref } from 'vue';
import { useRouter } from '#imports';
import { showToast } from '~/composables/useToast';
import { useTheme } from '~/composables/useTheme';
import { useHealthChecks } from '~/shared/composables/useHealthChecks';
import { useAuthStore } from '~/stores/auth';

type HealthSummaryItem = {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
};

type HealthQuickItem = {
  key: string;
  title: string;
  description: string;
  tone: 'danger' | 'warning' | 'success';
};

export function useAdminAccess() {
  const router = useRouter();
  const auth = useAuthStore();
  const theme = useTheme();

  const checkingInit = ref(true);
  const initialized = ref(false);
  const initializing = ref(false);
  const generatedToken = ref('');
  const tokenInput = ref('');
  const submitting = ref(false);
  const loginError = ref('');

  const healthChecks = useHealthChecks();

  const healthSummaryItems = computed<HealthSummaryItem[]>(() => {
    const envTotal = healthChecks.envItems.value.length;
    const envReady = healthChecks.envItems.value.filter((item) => item.ok).length;
    const kvTotal = healthChecks.kvItems.value.length;
    const kvReady = healthChecks.kvItems.value.filter((item) => item.ok).length;

    return [
      {
        label: '部署',
        value: healthChecks.loading.value
          ? '检查中'
          : healthChecks.error.value
            ? '失败'
            : healthChecks.health.value?.healthy
              ? '通过'
              : '待修复',
        tone: healthChecks.loading.value ? 'neutral' : healthChecks.health.value?.healthy ? 'success' : 'warning',
      },
      {
        label: '环境 / KV',
        value: `${envTotal ? `${envReady}/${envTotal}` : '-'} · ${kvTotal ? `${kvReady}/${kvTotal}` : '-'}`,
        tone: healthChecks.health.value?.healthy ? 'success' : 'neutral',
      },
      {
        label: '阻塞项',
        value: healthChecks.health.value ? String(healthChecks.health.value.summary.errorCount) : '-',
        tone: healthChecks.health.value?.summary.errorCount ? 'warning' : 'success',
      },
    ];
  });

  const quickHealthItems = computed<HealthQuickItem[]>(() => healthChecks.actionItems.value.slice(0, 3));

  const healthBadgeText = computed(() => {
    if (healthChecks.loading.value) return '检查中';
    if (healthChecks.error.value) return '状态未知';
    return healthChecks.health.value?.healthy ? '部署通过' : '待修复';
  });

  const healthBadgeClass = computed(() => {
    if (healthChecks.loading.value) return 'badge-neutral';
    if (healthChecks.error.value) return 'badge-neutral';
    return healthChecks.health.value?.healthy ? 'badge-emerald' : 'badge-amber';
  });

  function healthValueClass(tone: 'success' | 'warning' | 'neutral') {
    if (tone === 'success') return 'text-[var(--color-success)]';
    if (tone === 'warning') return 'text-[var(--color-warning)]';
    return 'text-app';
  }

  function quickHealthItemClass(tone: 'danger' | 'warning' | 'success') {
    if (tone === 'danger') return 'border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]';
    if (tone === 'warning') return 'border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]';
    return 'border-[var(--color-success-soft)] bg-[var(--color-success-soft)] text-[var(--color-success)]';
  }

  async function loadInitStatus() {
    checkingInit.value = true;
    initialized.value = await auth.checkInitStatus();
    checkingInit.value = false;
  }

  async function handleInitialize() {
    if (healthChecks.hasBlockingIssues.value) return;

    initializing.value = true;
    try {
      generatedToken.value = await auth.initialize();
      showToast('初始化成功', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '初始化失败', 'error');
    } finally {
      initializing.value = false;
    }
  }

  async function copyGeneratedToken() {
    if (!generatedToken.value) return;
    await navigator.clipboard.writeText(generatedToken.value);
    showToast('管理员令牌已复制', 'success');
  }

  async function saveAndEnter() {
    if (!generatedToken.value) return;
    auth.saveToken(generatedToken.value);
    await router.push('/admin/apps');
  }

  async function handleLogin() {
    loginError.value = '';
    submitting.value = true;

    try {
      const valid = await auth.login(tokenInput.value);
      if (!valid) {
        loginError.value = '管理员令牌无效，请确认输入内容是否完整。';
        return;
      }

      showToast('登录成功', 'success');
      await router.push('/admin/apps');
    } finally {
      submitting.value = false;
    }
  }

  async function initializePage() {
    await Promise.all([
      healthChecks.refresh(),
      loadInitStatus(),
    ]);
  }

  return {
    checkingInit,
    copyGeneratedToken,
    generatedToken,
    handleInitialize,
    handleLogin,
    healthBadgeClass,
    healthBadgeText,
    healthError: healthChecks.error,
    healthLoading: healthChecks.loading,
    healthSummaryItems,
    healthValueClass,
    hasBlockingIssues: healthChecks.hasBlockingIssues,
    initializePage,
    initialized,
    initializing,
    isDark: theme.isDark,
    loginError,
    quickHealthItemClass,
    quickHealthItems,
    refreshHealth: healthChecks.refresh,
    saveAndEnter,
    submitting,
    toggleTheme: theme.toggle,
    tokenInput,
  };
}
