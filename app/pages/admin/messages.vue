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
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">方向</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">类型</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">标题</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">来源/目标</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">时间</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr v-for="msg in messages" :key="msg.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td class="px-4 py-3">
              <span :class="getDirectionClass(msg.direction)" class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full">
                <Icon :icon="getDirectionIcon(msg.direction)" class="text-sm" />
                {{ msg.direction === 'outbound' ? '发出' : '收到' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span :class="getTypeClass(msg.type)" class="px-2 py-0.5 text-xs font-medium rounded-full">
                {{ getTypeLabel(msg.type) }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
              {{ msg.title }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              <template v-if="msg.direction === 'outbound'">
                <div class="flex items-center gap-2">
                  <Icon icon="heroicons:cube" class="text-gray-400 text-sm" />
                  <span>{{ msg.appName || msg.appId || '-' }}</span>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-2">
                  <img
                    v-if="msg.userAvatar"
                    :src="msg.userAvatar"
                    class="w-6 h-6 rounded-full object-cover"
                    :alt="msg.userNickname || '用户'"
                  />
                  <div v-else class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700">
                    <Icon icon="heroicons:user" class="text-gray-400 text-sm" />
                  </div>
                  <span>{{ msg.userNickname || truncateOpenId(msg.openId) }}</span>
                </div>
              </template>
            </td>
            <td class="px-4 py-3">
              <template v-if="msg.direction === 'outbound' && msg.results">
                <span :class="getStatusClass(msg.results)" class="px-2 py-0.5 text-xs font-medium rounded-full">
                  {{ getStatusText(msg.results) }}
                </span>
              </template>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              {{ formatDateTime(msg.createdAt) }}
            </td>
            <td class="px-4 py-3 text-right">
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
    <div v-if="selectedMessage" class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto">
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-2xl max-h-[80vh]">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">消息详情</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="selectedMessage = null"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="p-4 overflow-y-auto">
            <div class="space-y-4">
              <!-- Direction & Type -->
              <div class="flex items-center gap-4">
                <span :class="getDirectionClass(selectedMessage.direction)" class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full">
                  <Icon :icon="getDirectionIcon(selectedMessage.direction)" class="text-sm" />
                  {{ selectedMessage.direction === 'outbound' ? '发出' : '收到' }}
                </span>
                <span :class="getTypeClass(selectedMessage.type)" class="px-2 py-0.5 text-xs font-medium rounded-full">
                  {{ getTypeLabel(selectedMessage.type) }}
                </span>
              </div>

              <!-- Basic Info -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">消息 ID</label>
                  <p class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ selectedMessage.id }}</p>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">渠道 ID</label>
                  <p class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ selectedMessage.channelId }}</p>
                </div>
                <div v-if="selectedMessage.appId">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">应用</label>
                  <p class="text-sm text-gray-900 dark:text-gray-100">
                    {{ selectedMessage.appName || selectedMessage.appId }}
                  </p>
                </div>
                <div v-if="selectedMessage.openId">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">用户</label>
                  <div class="flex items-center gap-2">
                    <img
                      v-if="selectedMessage.userAvatar"
                      :src="selectedMessage.userAvatar"
                      class="w-8 h-8 rounded-full object-cover"
                      :alt="selectedMessage.userNickname || '用户'"
                    />
                    <div v-else class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700">
                      <Icon icon="heroicons:user" class="text-gray-400" />
                    </div>
                    <div>
                      <p v-if="selectedMessage.userNickname" class="text-sm text-gray-900 dark:text-gray-100">{{ selectedMessage.userNickname }}</p>
                      <p class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">{{ selectedMessage.openId }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="selectedMessage.event">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">事件类型</label>
                  <p class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ selectedMessage.event }}</p>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">时间</label>
                  <p class="text-sm text-gray-900 dark:text-gray-100">{{ formatDateTime(selectedMessage.createdAt) }}</p>
                </div>
              </div>

              <!-- Title -->
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">标题</label>
                <p class="text-sm text-gray-900 dark:text-gray-100">{{ selectedMessage.title }}</p>
              </div>

              <!-- Content -->
              <div v-if="selectedMessage.desp">
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">内容</label>
                <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{{ selectedMessage.desp }}</div>
              </div>

              <!-- Delivery Results (outbound only) -->
              <div v-if="selectedMessage.direction === 'outbound' && selectedMessage.results && selectedMessage.results.length > 0">
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-2">发送结果</label>
                <div class="space-y-2">
                  <div
                    v-for="(result, idx) in selectedMessage.results"
                    :key="idx"
                    class="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div class="flex items-center justify-center w-6 h-6 rounded-full" :class="result.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
                      <Icon
                        :icon="result.success ? 'heroicons:check' : 'heroicons:x-mark'"
                        :class="result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                        class="text-sm"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">{{ result.openId }}</p>
                      <p v-if="result.error" class="text-xs text-red-500">{{ result.error }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="fixed inset-0 bg-black/50 -z-10" @click="selectedMessage = null"></div>
      </div>
    </div>
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

// Helper functions
function getDirectionIcon(direction: MessageDirection): string {
  return direction === 'outbound' ? 'heroicons:arrow-up-right' : 'heroicons:arrow-down-left';
}

function getDirectionClass(direction: MessageDirection): string {
  return direction === 'outbound'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
}

function getTypeLabel(type: MessageRecordType): string {
  const labels: Record<MessageRecordType, string> = {
    push: '推送',
    text: '文本',
    event: '事件',
  };
  return labels[type] || type;
}

function getTypeClass(type: MessageRecordType): string {
  const classes: Record<MessageRecordType, string> = {
    push: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    text: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    event: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return classes[type] || 'bg-gray-100 text-gray-700';
}

function getStatusClass(results: DeliveryResult[]): string {
  const allSuccess = results.every(r => r.success);
  const allFailed = results.every(r => !r.success);
  if (allSuccess) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (allFailed) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
}

function getStatusText(results: DeliveryResult[]): string {
  const success = results.filter(r => r.success).length;
  const total = results.length;
  if (success === total) return '成功';
  if (success === 0) return '失败';
  return `${success}/${total}`;
}

function truncateOpenId(openId?: string): string {
  if (!openId) return '-';
  if (openId.length <= 12) return openId;
  return `${openId.slice(0, 6)}...${openId.slice(-4)}`;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}

onMounted(() => {
  fetchMessages();
});
</script>
