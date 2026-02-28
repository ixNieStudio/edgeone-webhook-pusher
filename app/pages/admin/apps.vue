<template>
  <div class="h-full flex">
    <!-- Desktop: Two-panel layout -->
    <template v-if="!isMobile">
      <!-- List Panel -->
      <div class="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-lg font-semibold">应用管理</h1>
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
          <AppList
            v-else
            :apps="apps"
            :selected-id="selectedId"
            @select="handleSelect"
          />
        </div>
      </div>

      <!-- Detail Panel -->
      <div class="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-950">
        <AppDetail
          v-if="selectedApp"
          :app="selectedApp"
          :channel="selectedChannel"
          @update="fetchData"
          @delete="handleDelete"
        />
        <UsageGuide
          v-else-if="apps.length > 0"
        />
        <EmptyState
          v-else
          icon="i-heroicons-cursor-arrow-rays"
          message="开始创建你的第一个应用"
        >
          <template #action>
            <button v-if="channels.length > 0" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors" @click="showCreateModal = true">
              创建第一个应用
            </button>
            <div v-else class="text-sm text-gray-500">
              请先 <NuxtLink to="/admin/channels" class="text-primary-600 hover:underline">创建渠道</NuxtLink>
            </div>
          </template>
        </EmptyState>
      </div>
    </template>

    <!-- Mobile: Single column layout -->
    <template v-else>
      <div v-if="!showMobileDetail" class="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <h1 class="text-lg font-semibold">应用管理</h1>
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
          <UsageGuide v-else-if="apps.length === 0" />
          <AppList
            v-else
            :apps="apps"
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
          <AppDetail
            v-if="selectedApp"
            :app="selectedApp"
            :channel="selectedChannel"
            @update="fetchData"
            @delete="handleMobileDelete"
          />
        </div>
      </div>
    </template>

    <!-- Create Modal -->
    <CreateAppModal
      :show="showCreateModal"
      :channels="channels"
      @close="showCreateModal = false"
      @created="handleAppCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { AppWithCount, Channel, CreateAppInput } from '~/types';
import { PushModes, MessageTypes } from '~/types';

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
const apps = ref<AppWithCount[]>([]);
const channels = ref<Channel[]>([]);
const selectedId = ref<string | null>(null);
const showCreateModal = ref(false);

const selectedApp = computed(() =>
  apps.value.find(a => a.id === selectedId.value)
);

const selectedChannel = computed(() =>
  selectedApp.value ? channels.value.find(c => c.id === selectedApp.value?.channelId) : null
);


// Check responsive
function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  fetchData();
  
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

async function fetchData() {
  loading.value = true;
  try {
    const [appsRes, channelsRes] = await Promise.all([
      api.getApps(),
      api.getChannels(),
    ]);
    apps.value = appsRes.data || [];
    channels.value = channelsRes.data || [];
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '获取数据失败', color: 'error' });
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
  fetchData();
}

function handleMobileDelete() {
  selectedId.value = null;
  showMobileDetail.value = false;
  fetchData();
}

async function handleAppCreated(appId: string) {
  await fetchData();
  // Auto select the new app
  if (appId) {
    selectedId.value = appId;
    if (isMobile.value) {
      showMobileDetail.value = true;
    }
  }
}
</script>
