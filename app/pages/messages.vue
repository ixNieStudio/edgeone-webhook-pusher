<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">消息历史</h1>
      <div class="relative w-48">
        <Icon icon="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="appFilter"
          placeholder="按应用ID筛选"
          class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          @input="handleFilterChange"
        />
      </div>
    </div>

    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="p-4">
        <div v-if="loading" class="flex justify-center py-12">
          <Icon icon="heroicons:arrow-path" class="text-3xl animate-spin text-gray-400" />
        </div>

        <div v-else-if="messages.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
          <Icon icon="heroicons:chat-bubble-left-right" class="text-5xl mb-3 opacity-50" />
          <p>暂无消息记录</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3">标题</th>
                <th class="px-4 py-3">应用ID</th>
                <th class="px-4 py-3">状态</th>
                <th class="px-4 py-3">时间</th>
                <th class="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="msg in messages" :key="msg.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-4 py-3">{{ msg.title }}</td>
                <td class="px-4 py-3">{{ msg.appId }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                    :class="getStatusClass(msg.results)"
                  >
                    {{ getStatusInfo(msg.results).label }}
                  </span>
                </td>
                <td class="px-4 py-3">{{ formatTime(msg.createdAt) }}</td>
                <td class="px-4 py-3">
                  <button
                    class="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    @click="showDetail(msg)"
                  >
                    <Icon icon="heroicons:eye" class="text-base" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total > pagination.pageSize" class="flex justify-center mt-4 gap-1">
          <button
            :disabled="pagination.current === 1"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="pagination.current > 1 && (pagination.current--, handlePageChange())"
          >
            上一页
          </button>
          <span class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
            {{ pagination.current }} / {{ Math.ceil(pagination.total / pagination.pageSize) }}
          </span>
          <button
            :disabled="pagination.current >= Math.ceil(pagination.total / pagination.pageSize)"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="pagination.current < Math.ceil(pagination.total / pagination.pageSize) && (pagination.current++, handlePageChange())"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
    >
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-2xl">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">消息详情</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="showDetailModal = false"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="p-4 overflow-y-auto max-h-[70vh]">
            <div v-if="selectedMessage" class="space-y-4">
              <dl class="space-y-3">
                <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <dt class="text-gray-500 dark:text-gray-400">消息ID</dt>
                  <dd><code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ selectedMessage.id }}</code></dd>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <dt class="text-gray-500 dark:text-gray-400">应用ID</dt>
                  <dd>{{ selectedMessage.appId }}</dd>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <dt class="text-gray-500 dark:text-gray-400">标题</dt>
                  <dd>{{ selectedMessage.title }}</dd>
                </div>
                <div class="py-2 border-b border-gray-100 dark:border-gray-800">
                  <dt class="text-gray-500 dark:text-gray-400 mb-2">内容</dt>
                  <dd>
                    <pre class="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg whitespace-pre-wrap break-all max-h-40 overflow-auto">{{ selectedMessage.desp || '无' }}</pre>
                  </dd>
                </div>
                <div class="flex justify-between py-2">
                  <dt class="text-gray-500 dark:text-gray-400">发送时间</dt>
                  <dd>{{ formatTime(selectedMessage.createdAt) }}</dd>
                </div>
              </dl>

              <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">发送结果</div>
              </div>

              <div class="space-y-2">
                <div
                  v-for="(result, i) in selectedMessage.results"
                  :key="i"
                  class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <Icon icon="heroicons:user" class="text-lg text-primary-600" />
                    <span class="text-sm font-mono">{{ result.openId }}</span>
                  </div>
                  <span
                    class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                    :class="result.success ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
                  >
                    {{ result.success ? '成功' : '失败' }}
                  </span>
                </div>
              </div>

              <div
                v-if="selectedMessage.results?.some(r => r.error)"
                class="p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              >
                <div class="flex items-start gap-3">
                  <Icon icon="heroicons:exclamation-triangle" class="text-xl shrink-0 mt-0.5" />
                  <div>
                    <div class="font-medium mb-1">错误信息</div>
                    <div v-for="(r, i) in selectedMessage.results" :key="i">
                      <div v-if="r.error" class="text-sm">
                        {{ r.openId }}: {{ r.error }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="fixed inset-0 bg-black/50 -z-10" @click="showDetailModal = false"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Message, DeliveryResult, PaginatedResponse } from '~/types';

definePageMeta({
  layout: 'default',
});

const api = useApi();
const toast = useToast();

const loading = ref(true);
const messages = ref<Message[]>([]);
const showDetailModal = ref(false);
const selectedMessage = ref<Message | null>(null);
const appFilter = ref('');

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});

function formatTime(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN');
}

function getStatusInfo(results: DeliveryResult[]) {
  if (!results || results.length === 0) {
    return { label: '未知', color: 'neutral' as const };
  }
  const allSuccess = results.every(r => r.success);
  const allFailed = results.every(r => !r.success);
  
  if (allSuccess) return { label: '成功', color: 'success' as const };
  if (allFailed) return { label: '失败', color: 'error' as const };
  return { label: '部分成功', color: 'warning' as const };
}

function getStatusClass(results: DeliveryResult[]) {
  const status = getStatusInfo(results);
  const classes = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return classes[status.color];
}

async function loadMessages() {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      appId: appFilter.value || undefined,
    };
    
    const res = await api.getMessages(params);
    if (res.code === 0 && res.data) {
      const data = res.data as PaginatedResponse<Message>;
      messages.value = data.items || [];
      pagination.total = data.pagination?.total || 0;
    } else {
      toast.add({ title: res.message || '获取消息列表失败', color: 'error' });
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '获取消息列表失败', color: 'error' });
  } finally {
    loading.value = false;
  }
}

function handlePageChange() {
  loadMessages();
}

function handleFilterChange() {
  pagination.current = 1;
  loadMessages();
}

function showDetail(msg: Message) {
  selectedMessage.value = msg;
  showDetailModal.value = true;
}

onMounted(loadMessages);
</script>
