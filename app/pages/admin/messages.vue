<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">消息历史</h1>
      <div class="flex items-center gap-3">
        <select
          v-model="directionFilter"
          class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          @change="handleFilterChange"
        >
          <option value="">全部方向</option>
          <option value="outbound">发出</option>
          <option value="inbound">收到</option>
        </select>
        <div class="relative w-48">
          <Icon icon="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
          <input
            v-model="searchFilter"
            placeholder="按应用/用户ID筛选"
            class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            @input="handleFilterChange"
          />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Icon icon="heroicons:arrow-path" class="text-3xl animate-spin text-gray-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="messages.length === 0" class="text-center py-12">
      <div class="flex justify-center">
        <Icon icon="heroicons:inbox" class="text-5xl text-gray-300 dark:text-gray-600" />
      </div>
      <p class="mt-4 text-gray-500 dark:text-gray-400">暂无消息记录</p>
    </div>

    <!-- Message Table -->
    <div v-else class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="w-full overflow-x-auto">
        <table class="w-full min-w-[980px] table-fixed">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th class="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">方向</th>
            <th class="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">类型</th>
            <th class="w-auto min-w-[220px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">标题</th>
            <th class="w-[240px] min-w-[180px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">来源/目标</th>
            <th class="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
            <th class="w-[180px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">时间</th>
            <th class="w-[80px] px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
          </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr v-for="msg in messages" :key="msg.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td class="w-[100px] px-4 py-3 align-top">
              <span :class="getDirectionClass(msg.direction)" class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full">
                <Icon :icon="getDirectionIcon(msg.direction)" class="text-sm" />
                {{ msg.direction === 'outbound' ? '发出' : '收到' }}
              </span>
            </td>
            <td class="w-[100px] px-4 py-3 align-top">
              <span :class="getTypeClass(msg.type)" class="px-2 py-0.5 text-xs font-medium rounded-full">
                {{ getTypeLabel(msg.type) }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 align-top">
              {{ msg.title }}
            </td>
            <td class="w-[240px] px-4 py-3 text-sm text-gray-500 dark:text-gray-400 align-top">
              <template v-if="msg.direction === 'outbound'">
                <div class="flex items-start gap-2 min-w-0">
                  <Icon icon="heroicons:cube" class="text-gray-400 text-sm shrink-0 mt-0.5" />
                  <span class="min-w-0 break-words whitespace-normal leading-5">{{ msg.appName || msg.appId || '-' }}</span>
                </div>
              </template>
              <template v-else>
                <div class="flex items-start gap-2 min-w-0">
                  <img
                    v-if="msg.userAvatar"
                    :src="msg.userAvatar"
                    class="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                    :alt="msg.userNickname || '用户'"
                  />
                  <div v-else class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-0.5">
                    <Icon icon="heroicons:user" class="text-gray-400 text-sm" />
                  </div>
                  <div class="min-w-0">
                    <p v-if="msg.userNickname" class="text-sm text-gray-700 dark:text-gray-200 break-words whitespace-normal leading-5">{{ msg.userNickname }}</p>
                    <p class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all leading-5">{{ msg.openId }}</p>
                  </div>
                </div>
              </template>
            </td>
            <td class="w-[100px] px-4 py-3 align-top">
              <template v-if="msg.direction === 'outbound' && msg.results">
                <span :class="getStatusClass(msg.results)" class="px-2 py-0.5 text-xs font-medium rounded-full">
                  {{ getStatusText(msg.results) }}
                </span>
              </template>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="w-[180px] px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap align-top">
              {{ formatDateTime(msg.createdAt) }}
            </td>
            <td class="w-[80px] px-4 py-3 text-right align-top">
              <button
                class="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                @click="showDetail(msg)"
              >
                <Icon icon="heroicons:eye" class="text-lg" />
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="mt-4 flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        共 {{ pagination.total }} 条记录，第 {{ pagination.page }}/{{ pagination.totalPages }} 页
      </p>
      <div class="flex items-center gap-2">
        <button
          :disabled="pagination.page <= 1"
          class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="goToPage(pagination.page - 1)"
        >
          上一页
        </button>
        <button
          :disabled="pagination.page >= pagination.totalPages"
          class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="goToPage(pagination.page + 1)"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- Detail Modal -->
    <MessageDetailModal
      :message="selectedMessage"
      @close="selectedMessage = null"
    />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Message, MessageDirection, MessageRecordType, DeliveryResult } from '~/types';

definePageMeta({
  layout: 'default',
});

const api = useApi();
const toast = useToast();

// State
const loading = ref(true);
const messages = ref<Message[]>([]);
const directionFilter = ref<'' | 'inbound' | 'outbound'>('');
const searchFilter = ref('');
const selectedMessage = ref<Message | null>(null);
const pagination = ref({
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
});

// Debounce filter change
let filterTimeout: ReturnType<typeof setTimeout> | null = null;

function handleFilterChange() {
  if (filterTimeout) clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    pagination.value.page = 1;
    fetchMessages();
  }, 300);
}

async function fetchMessages() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    };
    if (directionFilter.value) {
      params.direction = directionFilter.value;
    }
    if (searchFilter.value.trim()) {
      // 尝试判断是 appId 还是 openId
      const search = searchFilter.value.trim();
      if (search.startsWith('o') && search.length > 20) {
        params.openId = search;
      } else {
        params.appId = search;
      }
    }

    const res = await api.getMessages(params as any);
    if (res.data) {
      messages.value = res.data.items || [];
      pagination.value = {
        ...pagination.value,
        ...res.data.pagination,
      };
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '获取消息失败', color: 'error' });
  } finally {
    loading.value = false;
  }
}

function goToPage(page: number) {
  pagination.value.page = page;
  fetchMessages();
}

function showDetail(msg: Message) {
  selectedMessage.value = msg;
}

// Use formatting composable
const { getDirectionIcon, getDirectionClass, getTypeLabel, getTypeClass, getStatusClass, getStatusText, formatDateTime } = useMessageFormatting();

onMounted(() => {
  fetchMessages();
});
</script>
