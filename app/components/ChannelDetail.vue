<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Icon icon="heroicons:signal" class="text-green-600 dark:text-green-400 text-2xl" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">{{ channel.name }}</h2>
          <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {{ channel.type === 'wechat' ? '微信公众号' : channel.type }}
          </span>
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
            <dt class="text-gray-500 dark:text-gray-400">渠道 ID</dt>
            <dd class="flex items-center gap-2">
              <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ channel.id }}</code>
              <button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800" @click="copyToClipboard(channel.id, '渠道 ID')">
                <Icon icon="heroicons:clipboard" class="text-base" />
              </button>
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">创建时间</dt>
            <dd>{{ channel.createdAt }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">更新时间</dt>
            <dd>{{ channel.updatedAt }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- WeChat Config Card -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <span class="font-medium">微信配置</span>
      </div>
      <div class="p-4">
        <dl class="space-y-4">
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">AppID</dt>
            <dd class="flex items-center gap-2">
              <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ channel.config?.appId || '-' }}</code>
              <button v-if="channel.config?.appId" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800" @click="copyToClipboard(channel.config.appId, 'AppID')">
                <Icon icon="heroicons:clipboard" class="text-base" />
              </button>
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">AppSecret</dt>
            <dd>
              <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ maskSecret(channel.config?.appSecret) }}</code>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Usage Tips -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <span class="font-medium">使用说明</span>
      </div>
      <div class="p-4">
        <div class="space-y-4">
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <span class="text-primary-600 font-medium text-sm">1</span>
            </div>
            <div>
              <div class="font-medium text-sm">创建应用</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">在"应用管理"中创建应用，选择此渠道作为消息发送通道</div>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <span class="text-primary-600 font-medium text-sm">2</span>
            </div>
            <div>
              <div class="font-medium text-sm">绑定用户</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">在应用中添加 OpenID，绑定需要接收消息的微信用户</div>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <span class="text-primary-600 font-medium text-sm">3</span>
            </div>
            <div>
              <div class="font-medium text-sm">发送消息</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">通过应用的 Webhook URL 发送消息，系统会自动使用此渠道配置</div>
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
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">编辑渠道</h3>
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
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">渠道名称</label>
                <input v-model="editForm.name" placeholder="请输入渠道名称" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AppID</label>
                <input v-model="editForm.appId" :placeholder="channel.config?.appId || '微信公众号 AppID'" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AppSecret</label>
                <input v-model="editForm.appSecret" type="password" placeholder="留空则不修改" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
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
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Channel, UpdateChannelInput } from '~/types';

const props = defineProps<{
  channel: Channel;
}>();

const emit = defineEmits<{
  update: [];
  delete: [];
}>();

const api = useApi();
const toast = useToast();

const showEditModal = ref(false);
const saving = ref(false);
const editForm = ref({
  name: '',
  appId: '',
  appSecret: '',
});

watch(() => props.channel, (ch) => {
  editForm.value = {
    name: ch.name,
    appId: ch.config?.appId || '',
    appSecret: '',
  };
}, { immediate: true });

function maskSecret(secret: string | undefined) {
  if (!secret) return '-';
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '****' + secret.slice(-4);
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
    toast.add({ title: '请输入渠道名称', color: 'warning' });
    return;
  }
  saving.value = true;
  try {
    const updateData: UpdateChannelInput = {
      name: editForm.value.name.trim(),
    };
    if (editForm.value.appId.trim() || editForm.value.appSecret.trim()) {
      updateData.config = {
        appId: editForm.value.appId.trim() || props.channel.config?.appId,
        appSecret: editForm.value.appSecret.trim() || props.channel.config?.appSecret,
      };
    }
    await api.updateChannel(props.channel.id, updateData);
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
  const confirmed = window.confirm(`确定要删除渠道 "${props.channel.name}" 吗？如果有应用关联此渠道，将无法删除。`);
  if (!confirmed) return;
  
  try {
    await api.deleteChannel(props.channel.id);
    toast.add({ title: '删除成功', color: 'success' });
    emit('delete');
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '删除失败', color: 'error' });
  }
}
</script>
