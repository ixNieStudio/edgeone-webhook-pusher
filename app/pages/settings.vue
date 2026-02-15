<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-6">系统设置</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <Icon icon="heroicons:arrow-path" class="text-3xl animate-spin text-gray-400" />
    </div>

    <div v-else class="space-y-6">
      <!-- Reset Admin Token -->
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span class="font-medium">登录密钥</span>
        </div>
        <div class="p-4">
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">当前密钥</label>
              <code class="block text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">{{ maskedToken }}</code>
            </div>
            <div class="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Icon icon="heroicons:information-circle" class="text-yellow-500 text-lg shrink-0 mt-0.5" />
              <div class="text-xs text-yellow-700 dark:text-yellow-400">
                <div class="font-medium mb-1">关于密钥重置</div>
                <div>重置密钥后，旧密钥将立即失效。您需要使用新密钥重新登录系统。</div>
              </div>
            </div>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              @click="showResetModal = true"
            >
              <Icon icon="heroicons:arrow-path" class="text-base" />
              重置密钥
            </button>
          </div>
        </div>
      </div>

      <!-- Channel Link -->
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <span class="font-medium">微信公众号配置</span>
            <NuxtLink to="/channels">
              <button class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                前往渠道管理
                <Icon icon="heroicons:arrow-right" class="text-base" />
              </button>
            </NuxtLink>
          </div>
        </div>
        <div class="p-4">
          <div class="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
            <div class="flex items-start gap-3">
              <Icon icon="heroicons:information-circle" class="text-xl shrink-0 mt-0.5" />
              <p class="text-sm">微信公众号配置已移至渠道管理，请在渠道管理中创建和配置微信渠道。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Rate Limit Config -->
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span class="font-medium">速率限制</span>
        </div>
        <div class="p-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">每分钟限制</label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="formData.rateLimit.perMinute"
                type="number"
                :min="1"
                :max="100"
                class="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <span class="text-sm text-gray-500 dark:text-gray-400">每个应用每分钟最多发送的消息数</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Retention Config -->
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span class="font-medium">数据保留</span>
        </div>
        <div class="p-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">保留天数</label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="formData.retention.days"
                type="number"
                :min="1"
                :max="365"
                class="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <span class="text-sm text-gray-500 dark:text-gray-400">消息历史记录保留天数</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <button
          :disabled="saving"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="handleSave"
        >
          <Icon v-if="saving" icon="heroicons:arrow-path" class="text-base animate-spin" />
          <Icon v-else icon="heroicons:check" class="text-base" />
          保存配置
        </button>
      </div>

      <!-- Help Section -->
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span class="font-medium">配置帮助</span>
        </div>
        <div class="p-4">
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div v-for="(item, index) in helpItems" :key="index">
              <button
                class="py-3 inline-flex items-center justify-between gap-x-3 w-full font-medium text-start text-gray-800 hover:text-gray-500 dark:text-gray-200 dark:hover:text-gray-400 transition-colors"
                :class="{ 'text-primary-600 dark:text-primary-400': expandedHelp === index }"
                @click="expandedHelp = expandedHelp === index ? null : index"
              >
                {{ item.label }}
                <Icon :icon="expandedHelp === index ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="text-base" />
              </button>
              <div
                v-show="expandedHelp === index"
                class="pb-4 overflow-hidden"
              >
                <pre class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ item.content }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset Token Modal -->
    <ResetTokenModal :show="showResetModal" @close="showResetModal = false" @success="handleResetSuccess" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { SystemConfig } from '~/types';

definePageMeta({
  layout: 'default',
});

const api = useApi();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const expandedHelp = ref<number | null>(null);
const showResetModal = ref(false);
const currentAdminToken = ref('');

const formData = reactive({
  rateLimit: {
    perMinute: 5,
  },
  retention: {
    days: 30,
  },
});

const maskedToken = computed(() => {
  if (!currentAdminToken.value) return '***';
  if (currentAdminToken.value.length <= 8) return '*'.repeat(currentAdminToken.value.length);
  return currentAdminToken.value.slice(0, 4) + '*'.repeat(currentAdminToken.value.length - 8) + currentAdminToken.value.slice(-4);
});

const helpItems = [
  {
    label: '如何获取微信公众号 AppID 和 AppSecret？',
    content: `1. 登录微信公众平台 (https://mp.weixin.qq.com)
2. 进入「设置与开发」-「基本配置」
3. 在「公众号开发信息」中查看 AppID
4. 点击「重置」获取 AppSecret（请妥善保管）`,
  },
  {
    label: '如何创建消息模板？',
    content: `1. 在微信公众平台进入「功能」-「模板消息」
2. 从模板库中选择或创建新模板
3. 复制模板 ID 填入应用配置
4. 模板内容建议包含 {{title.DATA}} 和 {{content.DATA}} 字段`,
  },
  {
    label: '如何配置网页授权域名？',
    content: `1. 在微信公众平台进入「设置与开发」-「公众号设置」
2. 选择「功能设置」标签页
3. 在「网页授权域名」中添加您的域名
4. 下载验证文件并上传到网站根目录

注意：网页授权域名用于扫码绑定功能，请确保已正确配置。`,
  },
];

async function loadConfig() {
  loading.value = true;
  try {
    const res = await api.getConfig();
    if (res.data) {
      formData.rateLimit.perMinute = res.data.rateLimit?.perMinute || 5;
      formData.retention.days = res.data.retention?.days || 30;
      currentAdminToken.value = res.data.adminToken || '';
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '获取配置失败', color: 'error' });
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    const updateData: Partial<SystemConfig> = {
      rateLimit: formData.rateLimit,
      retention: formData.retention,
    };

    await api.updateConfig(updateData);
    toast.add({ title: '配置已保存', color: 'success' });
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '保存失败', color: 'error' });
  } finally {
    saving.value = false;
  }
}

function handleResetSuccess(newToken: string) {
  currentAdminToken.value = newToken;
  toast.add({ title: '密钥已重置，请使用新密钥重新登录', color: 'success' });
  // 可选：自动登出用户，强制使用新密钥登录
  // setTimeout(() => {
  //   navigateTo('/login');
  // }, 2000);
}

onMounted(loadConfig);
</script>
