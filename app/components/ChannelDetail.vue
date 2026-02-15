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
            <dd>{{ formatDateTime(channel.createdAt) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">更新时间</dt>
            <dd>{{ formatDateTime(channel.updatedAt) }}</dd>
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

    <!-- Token Status Card -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span class="font-medium">Token 维护状态</span>
        <button
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          :disabled="loadingTokenStatus"
          @click="refreshTokenStatus"
        >
          <Icon icon="heroicons:arrow-path" class="text-sm" :class="{ 'animate-spin': loadingTokenStatus }" />
          刷新
        </button>
      </div>
      <div class="p-4">
        <div v-if="loadingTokenStatus && !tokenStatus" class="flex items-center justify-center py-4">
          <Icon icon="heroicons:arrow-path" class="text-xl animate-spin text-gray-400" />
        </div>
        <dl v-else class="space-y-4">
          <div class="flex justify-between items-center">
            <dt class="text-gray-500 dark:text-gray-400">状态</dt>
            <dd>
              <span
                v-if="tokenStatus?.lastRefreshAt"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                :class="tokenStatus?.valid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
              >
                <Icon :icon="tokenStatus?.valid ? 'heroicons:check-circle' : 'heroicons:x-circle'" class="text-sm" />
                {{ tokenStatus?.valid ? '正常' : '异常' }}
              </span>
              <span v-else class="text-gray-400 text-sm">未获取</span>
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">最后刷新</dt>
            <dd>{{ formatDateTime(tokenStatus?.lastRefreshAt) }}</dd>
          </div>
          <div v-if="tokenStatus?.expiresAt" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">过期时间</dt>
            <dd>{{ formatDateTime(tokenStatus.expiresAt) }}</dd>
          </div>
          <div v-if="tokenStatus?.error" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">错误信息</dt>
            <dd class="text-red-600 dark:text-red-400 text-sm">{{ tokenStatus.error }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Usage Tips -->
    <ChannelConfigGuide :channel-id="channel.id" :channel="channel" />

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
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">消息 Token</label>
                <input v-model="editForm.msgToken" :placeholder="channel.config?.msgToken || '微信服务器配置中的 Token'" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                <p class="text-xs text-gray-400 mt-1">用于验证微信消息回调，需与公众号后台配置一致</p>
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
import type { TokenStatus } from '~/composables/api/useChannelApi';
import { formatDateTime } from '~/utils/datetime';

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
  msgToken: '',
});

// Token status
const tokenStatus = ref<TokenStatus | null>(null);
const loadingTokenStatus = ref(false);

async function refreshTokenStatus() {
  loadingTokenStatus.value = true;
  try {
    const res = await api.getChannelTokenStatus(props.channel.id);
    tokenStatus.value = res.data;
  } catch {
    // ignore
  } finally {
    loadingTokenStatus.value = false;
  }
}

// Load token status on mount
onMounted(() => {
  refreshTokenStatus();
});

// Reload when channel changes
watch(() => props.channel.id, () => {
  refreshTokenStatus();
});

watch(() => props.channel, (ch) => {
  editForm.value = {
    name: ch.name,
    appId: ch.config?.appId || '',
    appSecret: '',
    msgToken: ch.config?.msgToken || '',
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
    // 只要有任何配置字段变更，就更新 config
    if (editForm.value.appId.trim() || editForm.value.appSecret.trim() || editForm.value.msgToken.trim()) {
      updateData.config = {
        appId: editForm.value.appId.trim() || props.channel.config?.appId,
        appSecret: editForm.value.appSecret.trim() || props.channel.config?.appSecret,
        msgToken: editForm.value.msgToken.trim() || props.channel.config?.msgToken,
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
