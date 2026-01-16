<template>
  <div class="p-6">
    <div class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Icon icon="heroicons:signal" class="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div class="text-3xl font-bold">{{ stats.channels }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">渠道</div>
            </div>
          </div>
          <NuxtLink to="/channels" class="absolute right-4 bottom-4">
            <button class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 dark:text-gray-400">
              管理 <Icon icon="heroicons:arrow-right" />
            </button>
          </NuxtLink>
        </div>

        <div class="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Icon icon="heroicons:cube" class="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div class="text-3xl font-bold">{{ stats.apps }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">应用</div>
            </div>
          </div>
          <NuxtLink to="/apps" class="absolute right-4 bottom-4">
            <button class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 dark:text-gray-400">
              管理 <Icon icon="heroicons:arrow-right" />
            </button>
          </NuxtLink>
        </div>

        <div class="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Icon icon="heroicons:chat-bubble-left-right" class="text-2xl text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div class="text-3xl font-bold">{{ stats.messages }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">消息总数</div>
            </div>
          </div>
          <NuxtLink to="/messages" class="absolute right-4 bottom-4">
            <button class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 dark:text-gray-400">
              查看 <Icon icon="heroicons:arrow-right" />
            </button>
          </NuxtLink>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Icon icon="heroicons:user-group" class="text-2xl text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div class="text-3xl font-bold">{{ stats.openIds }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">订阅者</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span class="font-medium">快捷操作</span>
        </div>
        <div class="p-4 flex flex-wrap gap-3">
          <NuxtLink to="/channels">
            <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              <Icon icon="heroicons:plus" /> 新建渠道
            </button>
          </NuxtLink>
          <NuxtLink to="/apps">
            <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <Icon icon="heroicons:plus" /> 新建应用
            </button>
          </NuxtLink>
          <NuxtLink to="/settings">
            <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              <Icon icon="heroicons:cog-6-tooth" /> 系统设置
            </button>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { StatsData } from '~/types';

definePageMeta({
  layout: 'default',
});

const api = useApi();

const stats = ref<StatsData>({
  channels: 0,
  apps: 0,
  openIds: 0,
  messages: 0,
});

onMounted(async () => {
  const res = await api.getStats();
  if (res.code === 0 && res.data) {
    stats.value = res.data;
  }
});
</script>
