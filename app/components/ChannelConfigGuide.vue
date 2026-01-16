<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between">
        <span class="font-medium">公众号配置指引</span>
        <button
          v-if="!hideVerify"
          :disabled="verifying"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors"
          :class="verifyStatus === 'success' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : verifyStatus === 'error'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
          @click="handleVerify"
        >
          <Icon v-if="verifying" icon="heroicons:arrow-path" class="text-sm animate-spin" />
          <Icon v-else-if="verifyStatus === 'success'" icon="heroicons:check-circle" class="text-sm" />
          <Icon v-else-if="verifyStatus === 'error'" icon="heroicons:x-circle" class="text-sm" />
          <Icon v-else icon="heroicons:shield-check" class="text-sm" />
          {{ verifyStatus === 'success' ? '配置正常' : verifyStatus === 'error' ? '验证失败' : '验证配置' }}
        </button>
      </div>
    </div>
    <div class="p-4">
      <div class="space-y-4">
        <!-- Step 1 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">1</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">登录微信公众平台</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              访问 <a href="https://mp.weixin.qq.com" target="_blank" class="text-primary-600 hover:underline">mp.weixin.qq.com</a> 并登录您的公众号
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">2</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">获取 AppID 和 AppSecret</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              进入「设置与开发」→「基本配置」，获取开发者 ID (AppID) 和开发者密码 (AppSecret)
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">3</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">配置服务器地址</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              在「设置与开发」→「基本配置」→「服务器配置」中填写：
            </div>
            <div class="mt-2 space-y-2">
              <div class="flex items-start gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0 pt-1">URL:</span>
                <code class="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded overflow-x-auto break-all">{{ serverUrl }}</code>
                <button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0" @click="copyToClipboard(serverUrl, '服务器 URL')">
                  <Icon icon="heroicons:clipboard" class="text-sm" />
                </button>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0 pt-1">Token:</span>
                <code class="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">{{ msgToken }}</code>
                <button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0" @click="copyToClipboard(msgToken, 'Token')">
                  <Icon icon="heroicons:clipboard" class="text-sm" />
                </button>
              </div>
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-2">
              其他选项保持默认即可（EncodingAESKey 随机生成，加密方式选明文模式）
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">4</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">启用服务器配置</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              点击「启用」按钮，完成服务器配置。配置成功后，用户发送的消息将转发到本系统。
            </div>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="verifyError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div class="flex items-start gap-2">
          <Icon icon="heroicons:exclamation-triangle" class="text-red-500 text-lg shrink-0 mt-0.5" />
          <div class="text-sm text-red-700 dark:text-red-400">{{ verifyError }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Channel } from '~/types';

const props = defineProps<{
  channelId: string;
  channel?: Channel;
  hideVerify?: boolean;
}>();

const api = useApi();
const toast = useToast();

const verifying = ref(false);
const verifyStatus = ref<'idle' | 'success' | 'error'>('idle');
const verifyError = ref('');

const serverUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/v1/wechat/${props.channelId}`;
});

// 使用渠道配置中的 msgToken
const msgToken = computed(() => {
  return props.channel?.config?.msgToken || '';
});

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `${label}已复制`, color: 'success' });
  } catch {
    toast.add({ title: '复制失败', color: 'error' });
  }
}

async function handleVerify() {
  verifying.value = true;
  verifyError.value = '';
  try {
    await api.verifyChannel(props.channelId);
    verifyStatus.value = 'success';
    toast.add({ title: '配置验证成功', color: 'success' });
  } catch (e: unknown) {
    const err = e as Error;
    verifyStatus.value = 'error';
    verifyError.value = err.message || '验证失败，请检查 AppID 和 AppSecret 是否正确';
  } finally {
    verifying.value = false;
  }
}
</script>
