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
          <Icon icon="tabler:webhook" class="text-2xl text-white" />
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

            <!-- 环境变量配置提示 -->
            <div class="alert alert-info mb-6 text-left">
              <Icon icon="tabler:info-circle" class="text-xl shrink-0 mt-0.5" />
              <div class="flex-1">
                <div class="font-semibold text-sm mb-2">初始化前请确认</div>
                <div class="text-xs space-y-1.5 text-[var(--text-secondary)]">
                  <p>1. 已在 EdgeOne 项目中绑定 5 个 KV 命名空间</p>
                  <p>2. 已配置环境变量：</p>
                  <code class="block mt-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-lg text-[11px] mono border border-[var(--border-default)]">
                    KV_BASE_URL=https://your-domain.com
                  </code>
                  <p class="text-[11px] mt-2 flex items-center gap-1">
                    <Icon icon="tabler:alert-triangle" class="text-xs" />
                    建议使用你的自定义域名
                  </p>
                </div>
              </div>
            </div>

            <button
              class="btn btn-lg btn-solid-primary w-full"
              :disabled="initializing"
              @click="handleInit"
            >
              <Icon v-if="initializing" icon="svg-spinners:ring-resize" />
              <Icon v-else icon="tabler:player-play" />
              开始初始化
            </button>
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
            src="https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png"
            alt="EdgeOne"
            class="h-4 opacity-70 group-hover:opacity-100 transition-opacity"
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

const formData = reactive({
  token: '',
});

onMounted(async () => {
  auth.init();
  
  if (auth.isLoggedIn) {
    router.push('/');
    return;
  }

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
</script>
