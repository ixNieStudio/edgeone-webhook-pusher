<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-[var(--bg-secondary)] p-6 relative overflow-hidden">
    <!-- Animated background gradient -->
    <div class="absolute inset-0 bg-gradient-to-br from-primary-50 via-success-50 to-primary-50 dark:from-primary-950 dark:via-success-950 dark:to-primary-950 opacity-50"></div>
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.2),transparent_50%)]"></div>
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.2),transparent_50%)]"></div>

    <div class="w-full max-w-md relative z-10 animate-scale-in">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-14 h-14 mx-auto mb-5 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 transform hover:scale-105 transition-transform duration-200">
          <img src="/logo.png" alt="EdgeOne Webhook Pusher" class="h-9 w-9 object-contain" />
        </div>
        <h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">Webhook Pusher</h1>
        <p class="text-[var(--text-secondary)] text-sm">消息推送服务管理后台</p>
      </div>

      <!-- Loading State -->
      <div v-if="checking" class="card-glass card-lg animate-fade-in">
        <div class="text-center py-12">
          <Icon icon="svg-spinners:ring-resize" class="text-5xl text-primary-600 mb-4" />
          <p class="text-[var(--text-secondary)] text-sm font-medium">检查初始化状态...</p>
        </div>
      </div>

      <!-- Init Mode -->
      <div v-else-if="!isInitialized" class="card-glass card-lg animate-scale-in">
        <!-- Before Init -->
        <template v-if="!generatedToken">
          <div class="text-center py-6">
            <div class="w-14 h-14 mx-auto mb-5 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-900/10 rounded-2xl flex items-center justify-center shadow-lg">
              <Icon icon="tabler:rocket" class="text-2xl icon-primary" />
            </div>
            <h2 class="text-xl font-bold text-[var(--text-primary)] mb-2">首次使用</h2>
            <p class="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
              系统尚未初始化，点击下方按钮生成管理令牌
            </p>

            <div class="mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)]/70 p-4 text-left">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Icon icon="tabler:shield-check" class="text-base" />
                    <span>部署检查与配置引导</span>
                  </div>
                  <p class="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    开始初始化前，先确认环境变量和 KV 绑定都已就绪。
                  </p>
                </div>
                <span
                  v-if="healthData"
                  class="badge badge-xs shrink-0"
                  :class="healthData.healthy ? 'badge-soft-success' : 'badge-soft-danger'"
                >
                  {{ healthData.healthy ? '可初始化' : '需修复' }}
                </span>
              </div>

              <div v-if="healthChecking" class="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Icon icon="svg-spinners:ring-resize" class="text-sm" />
                <span>正在读取 /api/health ...</span>
              </div>

              <div v-else-if="healthError" class="alert alert-danger mt-4 text-xs">
                <Icon icon="tabler:alert-circle" class="shrink-0 text-base" />
                <span>{{ healthError }}</span>
              </div>

              <template v-else-if="healthData">
                <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="badge badge-xs"
                    :class="healthData.healthy ? 'badge-soft-success' : 'badge-soft-danger'"
                  >
                    {{ healthData.healthy ? '部署检查通过' : '部署存在阻塞项' }}
                  </span>
                  <span
                    class="badge badge-xs"
                    :class="healthData.ready ? 'badge-soft-success' : 'badge-soft-warning'"
                  >
                    {{ healthData.ready ? '可初始化' : '未就绪' }}
                  </span>
                  <span class="text-[var(--text-muted)]">
                    错误 {{ healthData.summary.errorCount }} · 警告 {{ healthData.summary.warningCount }}
                  </span>
                </div>

                <div class="mt-4 space-y-2">
                  <div
                    v-for="item in healthActionItems"
                    :key="item.key"
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
                        <p class="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{{ item.description }}</p>
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
              </template>

              <div v-else class="mt-4 text-xs text-[var(--text-muted)]">
                暂未获取到健康状态，仍可继续初始化，但建议先刷新健康检查确认配置。
              </div>
            </div>

            <button
              class="btn btn-lg btn-solid-primary w-full"
              :disabled="initializing || hasBlockingHealthIssues"
              @click="handleInit"
            >
              <Icon v-if="initializing" icon="svg-spinners:ring-resize" />
              <Icon v-else icon="tabler:player-play" />
              开始初始化
            </button>

            <p v-if="hasBlockingHealthIssues" class="mt-3 text-xs text-[var(--danger-600)]">
              当前部署检查存在阻塞项，请先完成上面的配置引导。
            </p>
          </div>
        </template>

        <!-- After Init - Show Token -->
        <template v-else>
          <div class="py-6">
            <div class="text-center mb-6">
              <div class="w-14 h-14 mx-auto mb-5 bg-gradient-to-br from-success-100 to-success-50 dark:from-success-900/30 dark:to-success-900/10 rounded-2xl flex items-center justify-center shadow-lg shadow-success-500/20">
                <Icon icon="tabler:circle-check" class="text-2xl icon-success" />
              </div>
              <h2 class="text-xl font-bold text-[var(--text-primary)]">初始化成功</h2>
            </div>

            <div class="alert alert-warning mb-6">
              <Icon icon="tabler:alert-triangle" class="text-xl shrink-0 mt-0.5" />
              <span class="text-sm font-medium">请妥善保存管理令牌，丢失后无法找回！</span>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-[var(--text-primary)] mb-2">管理令牌</label>
                <input
                  :value="generatedToken"
                  readonly
                  class="input input-md mono"
                />
              </div>

              <button
                class="btn btn-md btn-outline-primary w-full"
                @click="copyToken"
              >
                <Icon icon="tabler:copy" />
                复制令牌
              </button>

              <button
                class="btn btn-lg btn-solid-success w-full"
                @click="confirmAndLogin"
              >
                <Icon icon="tabler:arrow-right" />
                进入管理后台
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Login Mode -->
      <div v-else class="card-glass card-lg animate-scale-in">
        <div class="py-6">
          <div class="text-center mb-6">
            <h2 class="text-xl font-bold text-[var(--text-primary)]">管理员登录</h2>
            <p class="text-[var(--text-secondary)] text-sm mt-1">输入管理令牌以访问后台</p>
          </div>

          <form class="space-y-4" @submit.prevent="handleLogin">
            <div>
              <label class="block text-sm font-semibold text-[var(--text-primary)] mb-2">管理令牌</label>
              <div class="relative">
                <Icon icon="tabler:key" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-lg" />
                <input
                  v-model="formData.token"
                  type="password"
                  placeholder="请输入管理令牌"
                  :class="[
                    'input input-md pl-10',
                    loginError ? 'input-error' : ''
                  ]"
                />
              </div>
            </div>

            <div v-if="loginError" class="alert alert-danger text-sm">
              <Icon icon="tabler:alert-circle" class="shrink-0 text-lg" />
              <span>{{ loginError }}</span>
            </div>

            <button
              type="submit"
              class="btn btn-lg btn-solid-primary w-full"
              :disabled="logging"
            >
              <Icon v-if="logging" icon="svg-spinners:ring-resize" />
              <Icon v-else icon="tabler:login" />
              登录
            </button>
          </form>
        </div>
      </div>

      <!-- Health Check -->
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
              @click="fetchHealth"
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

      <!-- Footer -->
      <div class="text-center mt-8">
        <a
          href="https://edgeone.ai/?from=github"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-xs cursor-pointer group"
        >
          <span>Powered by</span>
          <img
            src="/logo.png"
            alt="EdgeOne Webhook Pusher"
            class="h-4 w-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
          />
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { useAuthStore } from '~/stores/auth';
import { showToast } from '~/composables/useToast';

definePageMeta({
  layout: 'auth',
});

const api = useApi();
const auth = useAuthStore();
const router = useRouter();

const checking = ref(true);
const isInitialized = ref(false);
const initializing = ref(false);
const generatedToken = ref('');
const logging = ref(false);
const loginError = ref('');
const healthChecking = ref(true);
const healthError = ref('');
const healthData = ref<HealthResponse | null>(null);

const formData = reactive({
  token: '',
});

onMounted(async () => {
  auth.init();
  
  if (auth.isLoggedIn) {
    router.push('/');
    return;
  }

  void fetchHealth();

  const res = await api.getInitStatus();
  checking.value = false;
  
  if (res.code === 0 && res.data) {
    isInitialized.value = res.data.initialized;
  }
});

async function handleInit() {
  initializing.value = true;
  
  try {
    const res = await api.doInit();
    
    if (res.code === 0 && res.data?.adminToken) {
      generatedToken.value = res.data.adminToken;
      showToast('初始化成功！', 'success');
    } else {
      showToast(res.message || '初始化失败', 'error');
    }
  } catch {
    showToast('初始化失败，请重试', 'error');
  } finally {
    initializing.value = false;
    void fetchHealth();
  }
}

async function copyToken() {
  await navigator.clipboard.writeText(generatedToken.value);
  showToast('已复制到剪贴板', 'success');
}

function confirmAndLogin() {
  auth.saveToken(generatedToken.value);
  router.push('/');
}

async function handleLogin() {
  if (!formData.token.trim()) {
    loginError.value = '请输入管理令牌';
    return;
  }

  logging.value = true;
  loginError.value = '';

  try {
    const success = await auth.login(formData.token);
    
    if (success) {
      showToast('登录成功', 'success');
      router.push('/');
    } else {
      loginError.value = '管理令牌无效，请检查后重试';
    }
  } catch {
    loginError.value = '登录失败，请重试';
  } finally {
    logging.value = false;
  }
}

interface HealthSummary {
  healthy: boolean;
  ready: boolean;
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
}

interface HealthResponse {
  success: boolean;
  healthy: boolean;
  ready: boolean;
  timestamp?: string;
  summary: HealthSummary;
  env: {
    BUILD_KEY: HealthEnvCheck;
    KV_BASE_URL: HealthEnvCheck;
  };
  kv: {
    bindings: Record<string, HealthKvBinding>;
  };
}

interface HealthEnvCheck {
  required: boolean;
  present: boolean;
  ok: boolean;
  length?: number;
  value?: string | null;
}

interface HealthKvBinding {
  ok: boolean;
  configured: boolean;
  readable: boolean;
  methods: {
    get: boolean;
    put: boolean;
    delete: boolean;
    list: boolean;
  };
  error?: string;
}

type HealthTone = 'success' | 'warning' | 'danger' | 'neutral';

interface HealthDisplayItem {
  key: string;
  label: string;
  tone: HealthTone;
  statusText: string;
  description: string;
  code?: string;
}

interface HealthGuideItem {
  key: string;
  title: string;
  tone: HealthTone;
  description: string;
  code?: string;
}

const hasBlockingHealthIssues = computed(() => Boolean(healthData.value) && !healthData.value.healthy);

const healthEnvItems = computed<HealthDisplayItem[]>(() => {
  const data = healthData.value;
  if (!data) return [];

  const kvBaseUrl = data.env.KV_BASE_URL;
  const kvBaseUrlTone: HealthTone = kvBaseUrl.present ? 'success' : 'danger';
  const kvBaseUrlStatus = kvBaseUrl.present ? '已配置' : '缺失';
  const kvBaseUrlDescription = !kvBaseUrl.present
    ? '未配置站点基准地址，Node Functions 将无法通过 /api/kv/* 访问 KV。'
    : `当前值为 ${kvBaseUrl.value}。`;

  return [
    {
      key: 'BUILD_KEY',
      label: 'BUILD_KEY',
      tone: data.env.BUILD_KEY.ok ? 'success' : 'danger',
      statusText: data.env.BUILD_KEY.ok ? '已配置' : '缺失',
      description: data.env.BUILD_KEY.ok
        ? `已检测到内部口令，长度 ${data.env.BUILD_KEY.length || 0}。`
        : 'Edge Functions 与 Node Functions 共用的内部访问口令，必须配置。',
    },
    {
      key: 'KV_BASE_URL',
      label: 'KV_BASE_URL',
      tone: kvBaseUrlTone,
      statusText: kvBaseUrlStatus,
      description: kvBaseUrlDescription,
      code: kvBaseUrl.value ? `KV_BASE_URL=${kvBaseUrl.value}` : 'KV_BASE_URL=https://your-domain.com',
    },
  ];
});

const healthKvBindingItems = computed<HealthDisplayItem[]>(() => {
  const data = healthData.value;
  if (!data) return [];

  return Object.entries(data.kv.bindings).map(([name, binding]) => {
    const missingMethods = Object.entries(binding.methods)
      .filter(([, available]) => !available)
      .map(([method]) => method);

    if (!binding.configured) {
      return {
        key: name,
        label: name,
        tone: 'danger',
        statusText: '缺失',
        description: '未绑定对应的 KV 命名空间，请在 EdgeOne 项目设置中添加同名绑定。',
      };
    }

    if (!binding.ok) {
      const methodText = missingMethods.length > 0
        ? `缺少方法：${missingMethods.join('、')}。`
        : '';

      return {
        key: name,
        label: name,
        tone: 'danger',
        statusText: '异常',
        description: `${methodText}${binding.error || 'KV 绑定存在问题，当前不可用。'}`.trim(),
      };
    }

    return {
      key: name,
      label: name,
      tone: 'success',
      statusText: '正常',
      description: '绑定存在且可读，KV API 方法完整。',
    };
  });
});

const healthActionItems = computed<HealthGuideItem[]>(() => {
  const data = healthData.value;
  if (!data) return [];

  const items: HealthGuideItem[] = [];

  if (!data.env.BUILD_KEY.ok) {
    items.push({
      key: 'action-build-key',
      title: '配置 BUILD_KEY',
      tone: 'danger',
      description: '请在 EdgeOne Pages 项目环境变量中添加 BUILD_KEY，Edge Functions 与 Node Functions 会共用这一个内部口令。',
      code: 'BUILD_KEY=Your-Strong-Passphrase',
    });
  }

  if (!data.env.KV_BASE_URL.ok) {
    items.push({
      key: 'action-kv-base-url',
      title: '配置 KV_BASE_URL',
      tone: 'danger',
      description: 'Node Functions 需要通过这个域名访问 /api/kv/*。请填写当前站点对外可访问的域名。',
      code: 'KV_BASE_URL=https://your-domain.com',
    });
  }

  const failedBindings = Object.entries(data.kv.bindings)
    .filter(([, binding]) => !binding.ok)
    .map(([name]) => name);

  if (failedBindings.length > 0) {
    items.push({
      key: 'action-kv-bindings',
      title: '补齐 KV 命名空间绑定',
      tone: 'danger',
      description: `以下 KV 绑定缺失或不可读：${failedBindings.join('、')}。请在 EdgeOne 项目设置中绑定同名 KV。`,
      code: failedBindings.join(', '),
    });
  }

  if (data.healthy) {
    items.push({
      key: 'action-deploy-ready',
      title: '环境已就绪，可以开始初始化',
      tone: 'success',
      description: '当前部署检查已经通过。点击“开始初始化”即可生成管理令牌。',
    });
  } else {
    items.push({
      key: 'action-deploy-blocked',
      title: '先修复部署配置',
      tone: 'warning',
      description: '请先完成上面的环境变量和 KV 绑定配置，部署检查通过后再执行初始化。',
    });
  }

  return items;
});

function getToneBadgeClass(tone: HealthTone) {
  switch (tone) {
    case 'success':
      return 'badge-soft-success';
    case 'warning':
      return 'badge-soft-warning';
    case 'danger':
      return 'badge-soft-danger';
    default:
      return 'badge-soft-neutral';
  }
}

function getTonePanelClass(tone: HealthTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/10';
    case 'warning':
      return 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/10';
    case 'danger':
      return 'border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/10';
    default:
      return 'border-[var(--border-default)] bg-[var(--bg-primary)]/70';
  }
}

function getToneTextClass(tone: HealthTone) {
  switch (tone) {
    case 'success':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    case 'danger':
      return 'text-rose-600 dark:text-rose-400';
    default:
      return 'text-[var(--text-muted)]';
  }
}

function getToneIcon(tone: HealthTone) {
  switch (tone) {
    case 'success':
      return 'tabler:circle-check';
    case 'warning':
      return 'tabler:alert-triangle';
    case 'danger':
      return 'tabler:alert-circle';
    default:
      return 'tabler:info-circle';
  }
}

async function fetchHealth() {
  healthChecking.value = true;
  healthError.value = '';
  healthData.value = null;

  try {
    const res = await fetch('/api/health', {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`健康检查失败 (${res.status})`);
    }

    const data = await res.json();

    if (!data || data.success !== true) {
      throw new Error(data?.error || '健康检查响应异常');
    }

    healthData.value = data as HealthResponse;
  } catch (error) {
    healthError.value = error instanceof Error ? error.message : '健康检查失败';
  } finally {
    healthChecking.value = false;
  }
}
</script>
