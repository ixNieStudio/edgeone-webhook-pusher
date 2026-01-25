<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-6">
    <div class="w-full max-w-sm">
      <!-- Header -->
      <div class="text-center text-white mb-8">
        <div class="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
          <Icon icon="tabler:webhook" class="text-3xl" />
        </div>
        <h1 class="text-2xl font-bold mb-1">Webhook Pusher</h1>
        <p class="text-white/80 text-sm">消息推送服务管理后台</p>
      </div>

      <!-- Loading State -->
      <div v-if="checking" class="card card-lg">
        <div class="text-center py-12">
          <Icon icon="svg-spinners:ring-resize" class="text-4xl text-primary-500 mb-4" />
          <p class="text-[var(--text-secondary)]">检查初始化状态...</p>
        </div>
      </div>

      <!-- Init Mode -->
      <div v-else-if="!isInitialized" class="card card-lg">
        <!-- Before Init -->
        <template v-if="!generatedToken">
          <div class="text-center py-8 px-2">
            <div class="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Icon icon="tabler:rocket" class="text-3xl icon-primary" />
            </div>
            <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">首次使用</h2>
            <p class="text-[var(--text-secondary)] text-sm mb-6">
              系统尚未初始化，点击下方按钮生成管理令牌
            </p>
            
            <!-- 环境变量配置提示 -->
            <div class="p-4 rounded-lg bg-info-100 dark:bg-info-900/20 border border-info-300 dark:border-info-800 text-info-700 dark:text-info-400 mb-6 text-left">
              <div class="flex gap-2 mb-2">
                <Icon icon="tabler:info-circle-filled" class="text-lg shrink-0 mt-0.5" />
                <span class="text-sm font-medium">初始化前请确认</span>
              </div>
              <div class="text-xs space-y-1 ml-6">
                <p>1. 已在 EdgeOne 项目中绑定 5 个 KV 命名空间</p>
                <p>2. 已配置环境变量：</p>
                <code class="block mt-1 px-2 py-1 bg-white/50 dark:bg-black/20 rounded text-[11px] font-mono">
                  KV_BASE_URL=https://your-domain.com
                </code>
                <p class="text-[11px] opacity-75 mt-1">
                  ⚠️ 建议使用你的自定义域名
                </p>
              </div>
            </div>
            
            <button
              class="btn btn-lg btn-solid-primary w-full"
              :disabled="initializing"
              @click="handleInit"
            >
              <Icon v-if="initializing" icon="svg-spinners:ring-resize" />
              <Icon v-else icon="tabler:player-play-filled" />
              开始初始化
            </button>
          </div>
        </template>

        <!-- After Init - Show Token -->
        <template v-else>
          <div class="py-6 px-2">
            <div class="text-center mb-6">
              <div class="w-16 h-16 mx-auto mb-4 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
                <Icon icon="tabler:circle-check-filled" class="text-3xl icon-success" />
              </div>
              <h2 class="text-lg font-semibold text-[var(--text-primary)]">初始化成功</h2>
            </div>
            
            <div class="p-4 rounded-lg bg-warning-100 dark:bg-warning-900/20 border border-warning-300 dark:border-warning-800 text-warning-700 dark:text-warning-400 mb-4">
              <div class="flex gap-2">
                <Icon icon="tabler:alert-triangle-filled" class="text-lg shrink-0 mt-0.5" />
                <span class="text-sm">请妥善保存管理令牌，丢失后无法找回！</span>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-[var(--text-primary)] mb-1">管理令牌</label>
                <input
                  :value="generatedToken"
                  readonly
                  class="input input-md font-mono"
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
                class="btn btn-lg btn-solid-primary w-full"
                @click="confirmAndLogin"
              >
                进入管理后台
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Login Mode -->
      <div v-else class="card card-lg">
        <div class="py-6 px-2">
          <div class="text-center mb-6">
            <h2 class="text-lg font-semibold text-[var(--text-primary)]">管理员登录</h2>
          </div>

          <form class="space-y-4" @submit.prevent="handleLogin">
            <div>
              <label class="block text-sm font-medium text-[var(--text-primary)] mb-1">管理令牌</label>
              <div class="relative">
                <Icon icon="tabler:key" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
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

            <div v-if="loginError" class="p-3 rounded-lg bg-danger-100 dark:bg-danger-900/20 border border-danger-300 dark:border-danger-800 text-danger-700 dark:text-danger-400 text-sm">
              <div class="flex gap-2">
                <Icon icon="tabler:alert-circle-filled" class="shrink-0 mt-0.5" />
                <span>{{ loginError }}</span>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-lg btn-solid-primary w-full"
              :disabled="logging"
            >
              <Icon v-if="logging" icon="svg-spinners:ring-resize" />
              登录
            </button>
          </form>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-6">
        <a href="https://edgeone.ai/?from=github" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors">
          <span class="text-xs">Powered by</span>
          <img src="https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png" alt="EdgeOne" class="h-5 bg-white rounded px-1.5 py-0.5" />
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
