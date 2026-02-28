<template>
  <div class="h-full flex flex-col">
    <!-- Demo Banner -->
    <DemoBanner />
    <!-- Project Introduction -->
    <ProjectIntroduction />
    
    <!-- Main Content -->
    <div class="flex-1 overflow-auto">
      <div class="px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-12">
          <Icon icon="heroicons:arrow-path" class="text-3xl animate-spin text-gray-400" />
        </div>
        <!-- Quick Start Guide -->
        <div v-if="!loading" class="card-glass card-lg">
          <div class="flex items-center gap-2 mb-4">
            <Icon icon="heroicons:book-open" class="text-primary-600 text-xl" />
            <span class="font-semibold text-lg">快速开始</span>
          </div>
          
          <!-- Welcome Notice -->
          <div class="alert alert-info mb-4">
            <Icon icon="heroicons:information-circle" class="text-lg shrink-0" />
            <div class="text-sm">
              <div class="font-medium mb-1">欢迎体验微信消息推送系统</div>
              <div class="text-xs">体验模式已自动配置好测试渠道和模板，您只需创建应用、绑定微信即可测试推送功能。应用数据将在 3 天后自动删除。</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Step 1 -->
            <div class="flex gap-3">
              <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <span class="text-primary-600 font-medium text-sm">1</span>
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm">创建体验应用</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  选择推送模式和消息类型
                </div>
              </div>
            </div>
            <!-- Step 2 -->
            <div class="flex gap-3">
              <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <span class="text-primary-600 font-medium text-sm">2</span>
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm">绑定微信用户</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  扫码或发送绑定码完成绑定
                </div>
              </div>
            </div>
            <!-- Step 3 -->
            <div class="flex gap-3">
              <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <span class="text-primary-600 font-medium text-sm">3</span>
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm">发送测试消息</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  使用 Webhook URL 发送推送
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- App List Section -->
        <div>
          <div v-if="!loading && apps.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DemoAppCard
              v-for="app in apps"
              :key="app.id"
              :app="app"
              :bind-code="bindCodes[app.id]"
              :generating-code="generatingCode[app.id]"
              @delete="handleDelete"
              @generate-code="handleGenerateCode"
              @copy="copyToClipboard"
            />
            <!-- Create New Button -->
            <button
              class="card card-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all cursor-pointer group"
              @click="showCreateModal = true"
            >
              <div class="flex flex-col items-center justify-center py-8 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                <Icon icon="heroicons:plus" class="text-3xl mb-2" />
                <div class="text-sm font-medium">创建新应用</div>
              </div>
            </button>
          </div>
          <!-- Empty State - No Apps -->
          <div v-if="!loading && apps.length === 0" class="text-center py-12">
            <Icon icon="heroicons:cube-transparent" class="text-6xl text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">开始体验</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              创建您的第一个体验应用，快速测试微信公众号推送功能
            </p>
            <button
              class="btn btn-solid-primary btn-md"
              @click="showCreateModal = true"
            >
              <Icon icon="heroicons:plus" class="text-base" />
              创建第一个应用
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
    >
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="card card-md w-full max-w-md">
          <div class="flex justify-between items-center pb-3 mb-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">创建体验应用</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              @click="showCreateModal = false"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">应用名称</label>
              <input
                v-model="createForm.name"
                placeholder="请输入应用名称"
                class="input input-md"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">推送模式</label>
              <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    v-model="createForm.pushMode"
                    value="single"
                    class="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">单播（发送给第一个绑定用户）</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    v-model="createForm.pushMode"
                    value="subscribe"
                    class="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">订阅（发送给所有绑定用户）</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">消息类型</label>
              <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    v-model="createForm.messageType"
                    value="template"
                    class="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <div class="flex-1">
                    <span class="text-sm text-gray-700 dark:text-gray-300">模板消息（推荐）</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">无时间限制，体验模式自动使用测试模板</p>
                  </div>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    v-model="createForm.messageType"
                    value="text"
                    class="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <div class="flex-1">
                    <span class="text-sm text-gray-700 dark:text-gray-300">文本消息</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">有 48 小时限制</p>
                  </div>
                </label>
              </div>
            </div>
            <div class="alert alert-info">
              <Icon icon="heroicons:information-circle" class="text-xl shrink-0" />
              <div class="text-sm">
                <p class="font-medium mb-1">体验模式说明</p>
                <ul class="text-xs space-y-1">
                  <li>• 自动使用测试渠道和模板配置</li>
                  <li>• 应用数据将在 3 天后自动删除</li>
                  <li>• 仅用于功能体验，请勿用于生产</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="btn btn-ghost-neutral btn-md"
              @click="showCreateModal = false"
            >
              取消
            </button>
            <button
              :disabled="creating"
              class="btn btn-solid-primary btn-md"
              @click="handleCreate"
            >
              <Icon v-if="creating" icon="heroicons:arrow-path" class="text-base animate-spin" />
              创建
            </button>
          </div>
        </div>
        <div class="fixed inset-0 bg-black/50 -z-10" @click="showCreateModal = false"></div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { DemoAppWithInfo, DemoAppCreateInput } from '~/composables/useDemoApps';
const demoApps = useDemoApps();
const toast = useToast();
// State
const loading = ref(true);
const apps = ref<DemoAppWithInfo[]>([]);
const showCreateModal = ref(false);
const creating = ref(false);
const generatingCode = ref<Record<string, boolean>>({});
const bindCodes = ref<Record<string, { code: string; expiresIn: string; qrCodeUrl?: string }>>({});
const pollingIntervals = ref<Record<string, NodeJS.Timeout>>({});
const createForm = ref<DemoAppCreateInput>({
  name: '',
  pushMode: 'single',
  messageType: 'template',
});
onMounted(() => {
  fetchApps();
});
async function fetchApps() {
  loading.value = true;
  try {
    const res = await demoApps.list();
    if (res.success && res.data) {
      apps.value = res.data;
    } else {
      toast.add({ title: res.error || '获取应用列表失败', color: 'error' });
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '获取应用列表失败', color: 'error' });
  } finally {
    loading.value = false;
  }
}
async function handleCreate() {
  if (!createForm.value.name.trim()) {
    toast.add({ title: '请输入应用名称', color: 'warning' });
    return;
  }
  creating.value = true;
  try {
    const res = await demoApps.create(createForm.value);
    if (res.success) {
      toast.add({ title: '创建成功', color: 'success' });
      showCreateModal.value = false;
      resetCreateForm();
      await fetchApps();
    } else {
      toast.add({ title: res.error || '创建失败', color: 'error' });
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '创建失败', color: 'error' });
  } finally {
    creating.value = false;
  }
}
async function handleDelete(id: string) {
  if (!confirm('确定要删除这个应用吗？删除后无法恢复。')) {
    return;
  }
  try {
    const res = await demoApps.deleteApp(id);
    if (res.success) {
      toast.add({ title: '删除成功', color: 'success' });
      await fetchApps();
    } else {
      toast.add({ title: res.error || '删除失败', color: 'error' });
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '删除失败', color: 'error' });
  }
}
async function handleGenerateCode(appId: string) {
  generatingCode.value[appId] = true;
  try {
    const res = await demoApps.generateBindCode(appId);
    if (res.success && res.data) {
      const expiresInSeconds = Math.floor((res.data.expiresAt - Date.now()) / 1000);
      bindCodes.value[appId] = {
        code: res.data.bindCode,
        expiresIn: `${Math.floor(expiresInSeconds / 60)} 分钟后过期`,
        qrCodeUrl: res.data.qrCodeUrl,
      };
      toast.add({ title: '绑定码生成成功', color: 'success' });
      
      // Start polling bind status
      startPollingBindStatus(appId, res.data.bindCode);
    } else {
      toast.add({ title: res.error || '生成绑定码失败', color: 'error' });
    }
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '生成绑定码失败', color: 'error' });
  } finally {
    generatingCode.value[appId] = false;
  }
}
function startPollingBindStatus(appId: string, code: string) {
  // Clear previous polling if exists
  if (pollingIntervals.value[appId]) {
    clearInterval(pollingIntervals.value[appId]);
  }
  // Poll every 3 seconds
  pollingIntervals.value[appId] = setInterval(async () => {
    try {
      const res = await demoApps.getBindCodeStatus(appId, code);
      if (res.success && res.data) {
        if (res.data.status === 'bound') {
          // Binding successful
          clearInterval(pollingIntervals.value[appId]);
          delete pollingIntervals.value[appId];
          delete bindCodes.value[appId];
          
          toast.add({ 
            title: `绑定成功！欢迎 ${res.data.nickname || '新用户'}`, 
            color: 'success' 
          });
          
          // Refresh app list to update bind count
          await fetchApps();
        } else if (res.data.status === 'expired') {
          // Bind code expired
          clearInterval(pollingIntervals.value[appId]);
          delete pollingIntervals.value[appId];
          delete bindCodes.value[appId];
          
          toast.add({ title: '绑定码已过期，请重新生成', color: 'warning' });
        }
      }
    } catch (e) {
      console.error('[DemoAppsPage] Poll bind status error:', e);
    }
  }, 3000);
}
function stopAllPolling() {
  Object.values(pollingIntervals.value).forEach(interval => {
    clearInterval(interval);
  });
  pollingIntervals.value = {};
}
onUnmounted(() => {
  stopAllPolling();
});
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.add({ title: '已复制到剪贴板', color: 'success' });
  }).catch(() => {
    toast.add({ title: '复制失败', color: 'error' });
  });
}
function resetCreateForm() {
  createForm.value = {
    name: '',
    pushMode: 'single',
    messageType: 'template',
  };
}
</script>
