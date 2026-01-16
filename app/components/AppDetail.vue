<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Icon icon="heroicons:cube" class="text-blue-600 dark:text-blue-400 text-2xl" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">{{ app.name }}</h2>
          <div class="flex gap-1 mt-1">
            <span
              class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
              :class="app.pushMode === 'single' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
            >
              {{ app.pushMode === 'single' ? '单播' : '订阅' }}
            </span>
            <span
              class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
              :class="app.messageType === 'template' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'"
            >
              {{ app.messageType === 'template' ? '模板消息' : '普通消息' }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="showEditModal = true"
        >
          <Icon icon="heroicons:pencil" class="text-base" />
          编辑
        </button>
        <button
          class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          @click="handleDelete"
        >
          <Icon icon="heroicons:trash" class="text-base" />
          删除
        </button>
      </div>
    </div>

    <!-- Info Card -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <span class="font-medium">基本信息</span>
      </div>
      <div class="p-4">
        <dl class="space-y-4">
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">App Key</dt>
            <dd class="flex items-center gap-2">
              <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ app.key }}</code>
              <button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800" @click="copyToClipboard(app.key, 'App Key')">
                <Icon icon="heroicons:clipboard" class="text-base" />
              </button>
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">关联渠道</dt>
            <dd>
              <span v-if="channel" class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Icon icon="heroicons:signal" class="mr-1" />
                {{ channel.name }}
              </span>
              <span v-else class="text-gray-400">{{ app.channelId }}</span>
            </dd>
          </div>
          <div v-if="app.messageType === 'template'" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">模板 ID</dt>
            <dd>
              <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ app.templateId || '-' }}</code>
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">创建时间</dt>
            <dd>{{ app.createdAt }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- OpenID Management -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <span class="font-medium">绑定用户</span>
          <button
            class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="showAddOpenIdModal = true"
          >
            <Icon icon="heroicons:plus" class="text-sm" />
            添加
          </button>
        </div>
      </div>
      <div class="p-4">
        <div v-if="openIds.length === 0" class="text-center py-6 text-gray-500 dark:text-gray-400">
          <Icon icon="heroicons:user-minus" class="text-3xl mb-2 opacity-50" />
          <p class="text-sm">暂无绑定用户</p>
          <button
            class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors mt-2"
            @click="showAddOpenIdModal = true"
          >
            添加第一个 OpenID
          </button>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="item in openIds"
            :key="item.id"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Icon icon="heroicons:user" class="text-lg text-primary-600" />
              <div>
                <div class="font-medium text-sm">{{ item.nickname || item.openId }}</div>
                <div v-if="item.nickname" class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ item.openId }}</div>
                <div v-if="item.remark" class="text-xs text-gray-400">{{ item.remark }}</div>
              </div>
            </div>
            <button
              class="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              @click="handleDeleteOpenId(item)"
            >
              <Icon icon="heroicons:trash" class="text-base" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Webhook Usage -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <span class="font-medium">Webhook 使用</span>
      </div>
      <div class="p-4">
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Webhook URL</label>
            <div class="flex items-center gap-2">
              <code class="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded overflow-x-auto">{{ webhookUrl }}</code>
              <button class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800" @click="copyToClipboard(webhookUrl, 'Webhook URL')">
                <Icon icon="heroicons:clipboard" class="text-base" />
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="mt-4">
            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="flex gap-4" aria-label="Tabs">
                <button
                  v-for="(tab, index) in usageTabs"
                  :key="index"
                  class="py-2 px-1 text-sm font-medium border-b-2 transition-colors"
                  :class="activeTab === index ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
                  @click="activeTab = index"
                >
                  {{ tab.label }}
                </button>
              </nav>
            </div>
            <div class="mt-4">
              <div v-if="activeTab === 0">
                <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto"><code>curl "{{ webhookUrl }}?title=测试消息&amp;desp=这是消息内容"</code></pre>
              </div>
              <div v-else-if="activeTab === 1">
                <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto"><code>curl -X POST "{{ webhookUrl }}" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试消息","desp":"这是消息内容"}'</code></pre>
              </div>
              <div v-else>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">直接在浏览器地址栏访问：</p>
                <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto"><code>{{ webhookUrl }}?title=测试消息&amp;desp=这是消息内容</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
    >
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-md">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">编辑应用</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="showEditModal = false"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="p-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">应用名称</label>
                <input v-model="editForm.name" placeholder="请输入应用名称" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div v-if="app.messageType === 'template'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模板 ID</label>
                <input v-model="editForm.templateId" placeholder="微信模板消息 ID" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" @click="showEditModal = false">取消</button>
            <button :disabled="saving" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors" @click="handleUpdate">
              <Icon v-if="saving" icon="heroicons:arrow-path" class="text-base animate-spin" />
              保存
            </button>
          </div>
        </div>
        <div class="fixed inset-0 bg-black/50 -z-10" @click="showEditModal = false"></div>
      </div>
    </div>

    <!-- Add OpenID Modal -->
    <div
      v-if="showAddOpenIdModal"
      class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
    >
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-md">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">添加 OpenID</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="showAddOpenIdModal = false"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="p-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OpenID</label>
                <input v-model="addOpenIdForm.openId" placeholder="微信用户 OpenID" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">昵称</label>
                <input v-model="addOpenIdForm.nickname" placeholder="可选，便于识别" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">备注</label>
                <input v-model="addOpenIdForm.remark" placeholder="可选" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" @click="showAddOpenIdModal = false">取消</button>
            <button :disabled="addingOpenId" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors" @click="handleAddOpenId">
              <Icon v-if="addingOpenId" icon="heroicons:arrow-path" class="text-base animate-spin" />
              添加
            </button>
          </div>
        </div>
        <div class="fixed inset-0 bg-black/50 -z-10" @click="showAddOpenIdModal = false"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { AppWithCount, Channel, OpenID, UpdateAppInput, CreateOpenIDInput } from '~/types';

const props = defineProps<{
  app: AppWithCount;
  channel?: Channel | null;
}>();

const emit = defineEmits<{
  update: [];
  delete: [];
}>();

const api = useApi();
const toast = useToast();

// State
const openIds = ref<OpenID[]>([]);
const showEditModal = ref(false);
const showAddOpenIdModal = ref(false);
const saving = ref(false);
const addingOpenId = ref(false);
const activeTab = ref(0);

const editForm = ref({ name: '', templateId: '' });
const addOpenIdForm = ref<CreateOpenIDInput>({ openId: '', nickname: '', remark: '' });

const webhookUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/send/${props.app.key}`;
});

const usageTabs = [
  { label: 'cURL' },
  { label: 'POST' },
  { label: '浏览器' },
];

watch(() => props.app, (app) => {
  editForm.value = {
    name: app.name,
    templateId: app.templateId || '',
  };
  fetchOpenIds();
}, { immediate: true });

async function fetchOpenIds() {
  try {
    const res = await api.getAppOpenIds(props.app.id);
    openIds.value = res.data || [];
  } catch (e) {
    console.error('Failed to fetch openIds:', e);
  }
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `${label}已复制`, color: 'success' });
  } catch {
    toast.add({ title: '复制失败', color: 'error' });
  }
}

async function handleUpdate() {
  if (!editForm.value.name.trim()) {
    toast.add({ title: '请输入应用名称', color: 'warning' });
    return;
  }
  if (props.app.messageType === 'template' && !editForm.value.templateId.trim()) {
    toast.add({ title: '模板消息需要填写模板 ID', color: 'warning' });
    return;
  }
  saving.value = true;
  try {
    const updateData: UpdateAppInput = { name: editForm.value.name.trim() };
    if (props.app.messageType === 'template') {
      updateData.templateId = editForm.value.templateId.trim();
    }
    await api.updateApp(props.app.id, updateData);
    toast.add({ title: '更新成功', color: 'success' });
    showEditModal.value = false;
    emit('update');
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '更新失败', color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  const confirmed = window.confirm(`确定要删除应用 "${props.app.name}" 吗？此操作将同时删除所有绑定的 OpenID。`);
  if (!confirmed) return;
  
  try {
    await api.deleteApp(props.app.id);
    toast.add({ title: '删除成功', color: 'success' });
    emit('delete');
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '删除失败', color: 'error' });
  }
}

async function handleAddOpenId() {
  if (!addOpenIdForm.value.openId.trim()) {
    toast.add({ title: '请输入 OpenID', color: 'warning' });
    return;
  }
  addingOpenId.value = true;
  try {
    await api.createAppOpenId(props.app.id, {
      openId: addOpenIdForm.value.openId.trim(),
      nickname: addOpenIdForm.value.nickname?.trim() || undefined,
      remark: addOpenIdForm.value.remark?.trim() || undefined,
    });
    toast.add({ title: '添加成功', color: 'success' });
    showAddOpenIdModal.value = false;
    addOpenIdForm.value = { openId: '', nickname: '', remark: '' };
    await fetchOpenIds();
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '添加失败', color: 'error' });
  } finally {
    addingOpenId.value = false;
  }
}

async function handleDeleteOpenId(item: OpenID) {
  const confirmed = window.confirm(`确定要删除 OpenID "${item.nickname || item.openId}" 吗？`);
  if (!confirmed) return;
  
  try {
    await api.deleteAppOpenId(props.app.id, item.id);
    toast.add({ title: '删除成功', color: 'success' });
    await fetchOpenIds();
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '删除失败', color: 'error' });
  }
}
</script>
