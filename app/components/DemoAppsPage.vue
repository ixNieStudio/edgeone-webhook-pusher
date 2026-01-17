<template>
  <div class="h-full flex flex-col">
    <!-- Demo Banner -->
    <DemoBanner />
    
    <!-- Main Content -->
    <div class="flex-1 overflow-auto">
      <div class="max-w-4xl mx-auto p-6">
        <div class="mb-6">
          <h1 class="text-2xl font-bold mb-2">体验应用管理</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            快速体验微信公众号推送功能，无需登录即可创建应用并测试推送
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-12">
          <Icon icon="heroicons:arrow-path" class="text-3xl animate-spin text-gray-400" />
        </div>

        <!-- App List -->
        <div v-else-if="apps.length > 0" class="space-y-4">
          <div
            v-for="app in apps"
            :key="app.id"
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h3 class="text-lg font-semibold mb-1">{{ app.name }}</h3>
                <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>绑定用户: {{ app.openIdCount || 0 }}</span>
                  <span v-if="app.daysRemaining !== undefined" class="flex items-center gap-1">
                    <Icon icon="heroicons:clock" class="text-base" />
                    剩余 {{ app.daysRemaining }} 天
                  </span>
                </div>
              </div>
              <button
                class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                @click="handleDelete(app.id)"
                title="删除应用"
              >
                <Icon icon="heroicons:trash" class="text-xl" />
              </button>
            </div>

            <!-- Webhook URL -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook URL
              </label>
              <div class="flex gap-2">
                <input
                  :value="getWebhookUrl(app.id)"
                  readonly
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  @click="copyToClipboard(getWebhookUrl(app.id))"
                >
                  复制
                </button>
              </div>
            </div>

            <!-- Bind Code Section -->
            <div class="border-t border-gray-200 dark:border-gray-800 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">用户绑定</h4>
                <button
                  :disabled="generatingCode[app.id]"
                  class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  @click="handleGenerateCode(app.id)"
                >
                  <Icon v-if="generatingCode[app.id]" icon="heroicons:arrow-path" class="text-base animate-spin" />
                  生成绑定码
                </button>
              </div>
              
              <div v-if="bindCodes[app.id]" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div class="text-center mb-3">
                  <div class="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400 tracking-wider">
                    {{ bindCodes[app.id]?.code }}
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ bindCodes[app.id]?.expiresIn }}
                  </p>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 text-center">
                  在微信公众号中发送 "绑定 {{ bindCodes[app.id]?.code }}" 完成绑定
                </p>
              </div>
            </div>
          </div>

          <!-- Create New Button -->
          <button
            class="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            @click="showCreateModal = true"
          >
            <Icon icon="heroicons:plus" class="text-xl inline-block mr-2" />
            创建新应用
          </button>
        </div>

        <!-- Empty State -->
        <div v-else class="space-y-6">
          <!-- Usage Guide -->
          <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div class="flex items-center gap-2">
                <Icon icon="heroicons:book-open" class="text-primary-600 text-xl" />
                <span class="font-medium">快速开始指南</span>
              </div>
            </div>
            <div class="p-4">
              <!-- 欢迎说明 -->
              <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="flex items-start gap-2">
                  <Icon icon="heroicons:information-circle" class="text-blue-500 text-lg shrink-0 mt-0.5" />
                  <div class="text-sm text-blue-700 dark:text-blue-400">
                    <div class="font-medium mb-1">欢迎体验微信消息推送系统</div>
                    <div class="text-xs">体验模式已自动配置好测试渠道和模板，您只需创建应用、绑定微信即可测试推送功能。应用数据将在 3 天后自动删除。</div>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <!-- Step 1 -->
                <div class="flex gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <span class="text-primary-600 font-medium text-sm">1</span>
                  </div>
                  <div class="flex-1">
                    <div class="font-medium text-sm">创建体验应用</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      点击下方「创建第一个应用」按钮，输入应用名称并选择推送模式（单播或订阅）。系统会自动使用测试渠道和模板配置。
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
                      创建应用后，点击「生成绑定码」获取 6 位数字绑定码。在微信公众号中发送「绑定 XXXXXX」完成绑定（XXXXXX 为绑定码）。
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
                      复制应用的 Webhook URL，在浏览器中访问或使用 curl 命令发送测试消息。
                    </div>
                    <div class="mt-2">
                      <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">示例：</div>
                      <pre class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded overflow-x-auto">curl "https://your-domain.com/send/APP_KEY?title=测试&desp=内容"</pre>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 额外提示 -->
              <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div class="text-xs text-gray-600 dark:text-gray-400">
                  <div class="font-medium mb-1">推送模式说明</div>
                  <ul class="list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-500">
                    <li><strong>单播</strong>：只发送给第一个绑定的用户，适合个人通知</li>
                    <li><strong>订阅</strong>：发送给所有绑定的用户，适合群发通知</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Create First App CTA -->
          <div class="text-center py-8">
            <Icon icon="heroicons:cube-transparent" class="text-6xl text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">开始体验</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              创建您的第一个体验应用，快速测试微信公众号推送功能
            </p>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
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
        <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-md">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">创建体验应用</h3>
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
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">应用名称</label>
                <input
                  v-model="createForm.name"
                  placeholder="请输入应用名称"
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
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
              <div class="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                <div class="flex items-start gap-3">
                  <Icon icon="heroicons:information-circle" class="text-xl shrink-0 mt-0.5" />
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
            </div>
          </div>
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="showCreateModal = false"
            >
              取消
            </button>
            <button
              :disabled="creating"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
const bindCodes = ref<Record<string, { code: string; expiresIn: string }>>({});

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
      };
      toast.add({ title: '绑定码生成成功', color: 'success' });
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

function getWebhookUrl(appId: string): string {
  const origin = window.location.origin;
  return `${origin}/send/${appId}`;
}

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
