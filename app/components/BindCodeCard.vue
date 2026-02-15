<template>
  <div v-if="shouldShowBindCard" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between">
        <span class="font-medium">微信绑定</span>
        <button
          v-if="!bindCode"
          :disabled="generating"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="handleGenerate"
        >
          <Icon v-if="generating" icon="heroicons:arrow-path" class="text-sm animate-spin" />
          <Icon v-else icon="heroicons:qr-code" class="text-sm" />
          生成绑定码
        </button>
      </div>
    </div>
    <div class="p-4">
      <!-- No bind code -->
      <div v-if="!bindCode" class="text-center py-6 text-gray-500 dark:text-gray-400">
        <div class="flex justify-center mb-2">
          <Icon icon="heroicons:device-phone-mobile" class="text-4xl opacity-50" />
        </div>
        <p class="text-sm">点击「生成绑定码」开始绑定微信用户</p>
        <p class="text-xs mt-1">用户关注公众号后扫码或发送绑定码即可完成绑定</p>
      </div>

      <!-- Bind code display -->
      <div v-else class="space-y-4">
        <!-- QR Code (if available) -->
        <div v-if="bindCode.qrCodeUrl && bindCode.status === 'pending'" class="flex justify-center">
          <div class="p-2 bg-white rounded-lg border border-gray-200 dark:border-gray-700">
            <img :src="bindCode.qrCodeUrl" alt="绑定二维码" class="w-40 h-40" />
          </div>
        </div>

        <!-- Code display -->
        <div class="text-center">
          <div class="text-3xl font-mono font-bold tracking-widest text-primary-600 dark:text-primary-400">
            {{ bindCode.code }}
          </div>
          <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span v-if="bindCode.status === 'pending'">
              剩余 <span class="font-medium text-orange-500">{{ remainingTime }}</span>
            </span>
            <span v-else-if="bindCode.status === 'bound'" class="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <Icon icon="heroicons:check-circle" class="text-base" />
              绑定成功
            </span>
            <span v-else class="text-gray-400">
              已过期
            </span>
          </div>
        </div>

        <!-- Instructions -->
        <div v-if="bindCode.status === 'pending'" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div class="text-sm font-medium mb-2">绑定步骤：</div>
          <ol v-if="bindCode.qrCodeUrl" class="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>使用微信扫描上方二维码</li>
            <li>关注公众号（如未关注）</li>
            <li>等待绑定成功提示</li>
          </ol>
          <ol v-else class="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>关注公众号</li>
            <li>发送消息：<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">绑定 {{ bindCode.code }}</code></li>
            <li>等待绑定成功提示</li>
          </ol>
        </div>

        <!-- Bound user info -->
        <div v-if="bindCode.status === 'bound' && (bindCode.nickname || bindCode.openId)" class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div class="flex items-center gap-3">
            <img 
              v-if="bindCode.avatar" 
              :src="bindCode.avatar" 
              class="w-10 h-10 rounded-full shrink-0"
              alt="用户头像"
            />
            <div v-else class="w-10 h-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center shrink-0">
              <Icon icon="heroicons:user" class="text-lg text-green-600 dark:text-green-400" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm truncate">{{ bindCode.nickname || '微信用户' }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{{ bindCode.openId }}</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center gap-2">
          <button
            v-if="bindCode.status === 'pending'"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="copyBindCommand"
          >
            <Icon icon="heroicons:clipboard" class="text-sm" />
            复制绑定指令
          </button>
          <button
            :disabled="generating"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            @click="handleGenerate"
          >
            <Icon v-if="generating" icon="heroicons:arrow-path" class="text-sm animate-spin" />
            <Icon v-else icon="heroicons:arrow-path" class="text-sm" />
            {{ bindCode.status === 'bound' ? '重新绑定' : '刷新' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

interface BindCodeInfo {
  code: string;
  status: 'pending' | 'bound' | 'expired';
  expiresAt: number;
  openId?: string;
  nickname?: string;
  avatar?: string;
  qrCodeUrl?: string;  // 二维码图片 URL（仅认证服务号）
}

const props = defineProps<{
  appId: string;
  pushMode?: string;
  boundUserCount?: number;
}>();

const api = useApi();
const toast = useToast();

const bindCode = ref<BindCodeInfo | null>(null);
const generating = ref(false);
const remainingTime = ref('');
let pollTimer: ReturnType<typeof setInterval> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;

// 计算是否应该显示绑定卡片
const shouldShowBindCard = computed(() => {
  // 单播模式且已有绑定用户时，隐藏绑定卡片
  if (props.pushMode === 'single' && (props.boundUserCount ?? 0) > 0) {
    return false;
  }
  // 其他情况都显示
  return true;
});

onMounted(() => {
  // Start polling if there's an active bind code
});

onUnmounted(() => {
  stopPolling();
  stopCountdown();
});

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown() {
  stopCountdown();
  updateRemainingTime();
  countdownTimer = setInterval(updateRemainingTime, 1000);
}

function updateRemainingTime() {
  if (!bindCode.value || bindCode.value.status !== 'pending') {
    stopCountdown();
    return;
  }
  
  const now = Date.now();
  const remaining = bindCode.value.expiresAt - now;
  
  if (remaining <= 0) {
    bindCode.value.status = 'expired';
    remainingTime.value = '已过期';
    stopCountdown();
    stopPolling();
    return;
  }
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  remainingTime.value = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (!bindCode.value || bindCode.value.status !== 'pending') {
      stopPolling();
      return;
    }
    
    try {
      const res = await api.getBindCodeStatus(props.appId, bindCode.value.code);
      if (res.data) {
        if (res.data.status === 'bound') {
          bindCode.value = {
            ...bindCode.value,
            status: 'bound',
            openId: res.data.openId,
            nickname: res.data.nickname,
            avatar: res.data.avatar,
          };
          stopPolling();
          stopCountdown();
          toast.add({ title: '绑定成功！', color: 'success' });
        } else if (res.data.status === 'expired') {
          bindCode.value.status = 'expired';
          stopPolling();
          stopCountdown();
        }
      }
    } catch (e) {
      console.error('Poll bind code status failed:', e);
    }
  }, 3000);
}

async function handleGenerate() {
  generating.value = true;
  try {
    const res = await api.generateBindCode(props.appId);
    bindCode.value = {
      code: res.data.bindCode,
      status: 'pending',
      expiresAt: res.data.expiresAt,
      qrCodeUrl: res.data.qrCodeUrl,
    };
    startCountdown();
    startPolling();
    toast.add({ title: '绑定码已生成', color: 'success' });
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '生成失败', color: 'error' });
  } finally {
    generating.value = false;
  }
}

async function copyBindCommand() {
  if (!bindCode.value) return;
  try {
    await navigator.clipboard.writeText(`绑定 ${bindCode.value.code}`);
    toast.add({ title: '绑定指令已复制', color: 'success' });
  } catch {
    toast.add({ title: '复制失败', color: 'error' });
  }
}
</script>
