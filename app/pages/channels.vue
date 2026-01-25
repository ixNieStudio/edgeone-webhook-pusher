<template>
  <div class="h-full flex flex-col">
    <!-- 环境变量配置提示横幅 -->
    <div class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
      <div class="flex items-start gap-3">
        <Icon icon="tabler:alert-triangle" class="text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
            重要：请确保已配置环境变量
          </p>
          <p class="text-xs text-amber-700 dark:text-amber-400">
            微信消息回调需要访问 KV 存储。请在 EdgeOne 项目设置中配置：
            <code class="mx-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-[11px] font-mono">
              KV_BASE_URL=https://your-domain.com
            </code>
            （使用你的自定义域名或 EdgeOne 默认域名）
          </p>
        </div>
      </div>
    </div>
    
    <div class="flex-1 flex min-h-0">
    <!-- Desktop: Two-panel layout -->
    <template v-if="!isMobile">
      <!-- List Panel -->
      <div class="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-lg font-semibold">渠道管理</h1>
            <button
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              @click="showCreateModal = true"
            >
              <Icon icon="heroicons:plus" class="text-base" />
              新建
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div v-if="loading" class="flex justify-center py-8">
            <Icon icon="heroicons:arrow-path" class="text-2xl animate-spin text-gray-400" />
          </div>
          <ChannelList
            v-else
            :channels="channels"
            :selected-id="selectedId"
            @select="handleSelect"
          />
        </div>
      </div>

      <!-- Detail Panel -->
      <div class="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-950">
        <ChannelDetail
          v-if="selectedChannel"
          :channel="selectedChannel"
          @update="fetchChannels"
          @delete="handleDelete"
        />
        <div v-else class="max-w-4xl mx-auto">
          <div class="text-center mb-6">
            <h2 class="text-xl font-semibold mb-2">{{ channels.length === 0 ? '开始使用微信公众号推送' : '微信公众号配置指引' }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ channels.length === 0 ? '按照以下步骤配置您的第一个渠道' : '选择左侧渠道查看详情，或参考以下配置指引' }}</p>
          </div>
          <ChannelConfigGuide channel-id="demo" hide-verify />
          <div v-if="channels.length === 0" class="mt-6 text-center">
            <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors" @click="showCreateModal = true">
              <Icon icon="heroicons:plus" class="text-base" />
              创建第一个渠道
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Mobile: Single column layout -->
    <template v-else>
      <div v-if="!showMobileDetail" class="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <h1 class="text-lg font-semibold">渠道管理</h1>
            <button
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              @click="showCreateModal = true"
            >
              <Icon icon="heroicons:plus" class="text-base" />
              新建
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div v-if="loading" class="flex justify-center py-8">
            <Icon icon="heroicons:arrow-path" class="text-2xl animate-spin text-gray-400" />
          </div>
          <ChannelList
            v-else
            :channels="channels"
            :selected-id="selectedId"
            @select="handleMobileSelect"
          />
        </div>
      </div>

      <div v-else class="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="handleMobileBack"
          >
            <Icon icon="heroicons:arrow-left" class="text-base" />
            返回列表
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <ChannelDetail
            v-if="selectedChannel"
            :channel="selectedChannel"
            @update="fetchChannels"
            @delete="handleMobileDelete"
          />
        </div>
      </div>
    </template>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
    >
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-md">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">新建渠道</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="showCreateModal = false"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="p-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">渠道名称</label>
                <input v-model="createForm.name" placeholder="请输入渠道名称" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">渠道类型</label>
                <select disabled class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed">
                  <option value="wechat">微信公众号</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AppID</label>
                <input v-model="createForm.config.appId" placeholder="微信公众号 AppID" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AppSecret</label>
                <input v-model="createForm.config.appSecret" type="password" placeholder="微信公众号 AppSecret" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div class="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                <div class="flex items-start gap-3">
                  <Icon icon="heroicons:information-circle" class="text-xl shrink-0 mt-0.5" />
                  <p class="text-sm">渠道用于配置消息发送通道，创建后可在应用中引用</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" @click="showCreateModal = false">取消</button>
            <button :disabled="creating" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors" @click="handleCreate">
              <Icon v-if="creating" icon="heroicons:arrow-path" class="text-base animate-spin" />
              创建
            </button>
          </div>
        </div>
        <div class="fixed inset-0 bg-black/50 -z-10" @click="showCreateModal = false"></div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Channel, CreateChannelInput } from '~/types';
import { ChannelTypes } from '~/types';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const api = useApi();
const toast = useToast();

// Responsive
const isMobile = ref(false);
const showMobileDetail = ref(false);

// State
const loading = ref(true);
const channels = ref<Channel[]>([]);
const selectedId = ref<string | null>(null);
const showCreateModal = ref(false);
const creating = ref(false);

const createForm = ref<CreateChannelInput>({
  name: '',
  type: ChannelTypes.WECHAT,
  config: {
    appId: '',
    appSecret: '',
  },
});

const selectedChannel = computed(() =>
  channels.value.find(c => c.id === selectedId.value)
);

// Check responsive
function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  fetchChannels();
  
  // Handle URL query for selected item
  const selected = route.query.selected as string;
  if (selected) {
    selectedId.value = selected;
    if (isMobile.value) {
      showMobileDetail.value = true;
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

async function fetchChannels() {
  loading.value = true;
  try {
    const res = await api.getChannels();
    channels.value = res.data || [];
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '获取渠道列表失败', color: 'error' });
  } finally {
    loading.value = false;
  }
}

function handleSelect(id: string) {
  selectedId.value = id;
}

function handleMobileSelect(id: string) {
  selectedId.value = id;
  showMobileDetail.value = true;
}

function handleMobileBack() {
  showMobileDetail.value = false;
}

function handleDelete() {
  selectedId.value = null;
  fetchChannels();
}

function handleMobileDelete() {
  selectedId.value = null;
  showMobileDetail.value = false;
  fetchChannels();
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    toast.add({ title: '请输入渠道名称', color: 'warning' });
    return;
  }
  if (!createForm.value.config.appId.trim()) {
    toast.add({ title: '请输入 AppID', color: 'warning' });
    return;
  }
  if (!createForm.value.config.appSecret.trim()) {
    toast.add({ title: '请输入 AppSecret', color: 'warning' });
    return;
  }
  
  creating.value = true;
  try {
    const res = await api.createChannel(createForm.value);
    toast.add({ title: '创建成功', color: 'success' });
    showCreateModal.value = false;
    resetCreateForm();
    await fetchChannels();
    // Auto select the new channel
    if (res.data?.id) {
      selectedId.value = res.data.id;
      if (isMobile.value) {
        showMobileDetail.value = true;
      }
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '创建失败', color: 'error' });
  } finally {
    creating.value = false;
  }
}

function resetCreateForm() {
  createForm.value = {
    name: '',
    type: ChannelTypes.WECHAT,
    config: {
      appId: '',
      appSecret: '',
    },
  };
}
</script>
