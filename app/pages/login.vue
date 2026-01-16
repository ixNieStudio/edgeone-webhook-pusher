<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-6">
    <div class="w-full max-w-sm">
      <!-- Header -->
      <div class="text-center text-white mb-8">
        <div class="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
          <Icon icon="heroicons:bolt" class="text-3xl" />
        </div>
        <h1 class="text-2xl font-bold mb-1">Webhook Pusher</h1>
        <p class="text-white/80 text-sm">消息推送服务管理后台</p>
      </div>

      <!-- Loading State -->
      <div v-if="checking" class="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
        <div class="text-center py-12">
          <Icon icon="heroicons:arrow-path" class="text-4xl animate-spin text-blue-600 mb-4" />
          <p class="text-gray-500">检查初始化状态...</p>
        </div>
      </div>

      <!-- Init Mode -->
      <div v-else-if="!isInitialized" class="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
        <!-- Before Init -->
        <template v-if="!generatedToken">
          <div class="text-center py-8 px-2">
            <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Icon icon="heroicons:rocket-launch" class="text-3xl text-blue-600" />
            </div>
            <h2 class="text-lg font-semibold mb-2">首次使用</h2>
            <p class="text-gray-500 text-sm mb-6">
              系统尚未初始化，点击下方按钮生成管理令牌
            </p>
            <button
              class="w-full py-3 px-4 inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              :disabled="initializing"
              @click="handleInit"
            >
              <Icon v-if="initializing" icon="heroicons:arrow-path" class="animate-spin" />
              <Icon v-else icon="heroicons:play" />
              开始初始化
            </button>
          </div>
        </template>

        <!-- After Init - Show Token -->
        <template v-else>
          <div class="py-6 px-2">
            <div class="text-center mb-6">
              <div class="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Icon icon="heroicons:check-circle" class="text-3xl text-green-600" />
              </div>
              <h2 class="text-lg font-semibold">初始化成功</h2>
            </div>
            
            <div class="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300 mb-4">
              <div class="flex gap-2">
                <Icon icon="heroicons:exclamation-triangle" class="text-lg shrink-0 mt-0.5" />
                <span class="text-sm">请妥善保存管理令牌，丢失后无法找回！</span>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">管理令牌</label>
                <input
                  :value="generatedToken"
                  readonly
                  class="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              <button
                class="w-full py-2 px-4 inline-flex justify-center items-center gap-2 rounded-lg border border-blue-600 text-blue-600 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20"
                @click="copyToken"
              >
                <Icon icon="heroicons:clipboard-document" />
                复制令牌
              </button>

              <button
                class="w-full py-3 px-4 inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                @click="confirmAndLogin"
              >
                进入管理后台
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Login Mode -->
      <div v-else class="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
        <div class="py-6 px-2">
          <div class="text-center mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Icon icon="heroicons:lock-closed" class="text-3xl text-blue-600" />
            </div>
            <h2 class="text-lg font-semibold">管理员登录</h2>
          </div>

          <form class="space-y-4" @submit.prevent="handleLogin">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">管理令牌</label>
              <div class="relative">
                <Icon icon="heroicons:key" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="formData.token"
                  type="password"
                  placeholder="请输入管理令牌"
                  :class="[
                    'w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2',
                    loginError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'
                  ]"
                />
              </div>
            </div>

            <div v-if="loginError" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 text-sm">
              <div class="flex gap-2">
                <Icon icon="heroicons:exclamation-circle" class="shrink-0 mt-0.5" />
                <span>{{ loginError }}</span>
              </div>
            </div>

            <button
              type="submit"
              class="w-full py-3 px-4 inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              :disabled="logging"
            >
              <Icon v-if="logging" icon="heroicons:arrow-path" class="animate-spin" />
              登录
            </button>
          </form>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-white/60 text-xs mt-6">
        Powered by EdgeOne Functions
      </p>
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
