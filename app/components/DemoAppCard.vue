<template>
  <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
    <!-- Step Guidance -->
    <StepGuidance :steps="steps" />

    <!-- App Header -->
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
        <div class="flex items-center gap-3 mt-2 text-xs">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
            <Icon icon="heroicons:paper-airplane" class="text-sm" />
            {{ app.pushMode === 'single' ? '单播模式' : '订阅模式' }}
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
            <Icon icon="heroicons:document-text" class="text-sm" />
            {{ app.messageType === 'template' ? '模板消息' : '文本消息' }}
          </span>
        </div>
      </div>
      <button
        class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="$emit('delete', app.id)"
        title="删除应用"
      >
        <Icon icon="heroicons:trash" class="text-xl" />
      </button>
    </div>

    <!-- Bind Code Section - Moved before webhook -->
    <div class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">用户绑定</h4>
        <button
          :disabled="generatingCode"
          class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          @click="$emit('generateCode', app.id)"
        >
          <Icon v-if="generatingCode" icon="heroicons:arrow-path" class="text-base animate-spin" />
          生成绑定码
        </button>
      </div>
      
      <div v-if="bindCode" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <!-- 二维码（如果可用） -->
        <div v-if="bindCode.qrCodeUrl" class="text-center mb-4">
          <div class="inline-block p-3 bg-white rounded-lg shadow-sm">
            <img 
              :src="bindCode.qrCodeUrl" 
              alt="绑定二维码"
              class="w-48 h-48 mx-auto"
            />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            使用微信扫描二维码完成绑定
          </p>
        </div>

        <!-- 绑定码 -->
        <div class="text-center" :class="{ 'mb-3': !bindCode.qrCodeUrl }">
          <div class="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400 tracking-wider">
            {{ bindCode.code }}
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ bindCode.expiresIn }}
          </p>
        </div>

        <!-- 手动绑定说明 -->
        <p class="text-xs text-gray-600 dark:text-gray-400 text-center" :class="{ 'mt-3': bindCode.qrCodeUrl }">
          <span v-if="bindCode.qrCodeUrl">或</span>在微信公众号中发送 "绑定 {{ bindCode.code }}" 完成绑定
        </p>
      </div>
    </div>

    <!-- Webhook Content - Conditional Display -->
    <div v-if="hasBindings" class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
      <!-- Webhook URL -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Webhook URL
        </label>
        <div class="flex gap-2">
          <input
            :value="webhookUrl"
            readonly
            class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button
            class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            @click="$emit('copy', webhookUrl)"
          >
            复制
          </button>
        </div>
      </div>

      <!-- Webhook Usage Examples -->
      <div>
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">使用示例</h4>
      
      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700 mb-3">
        <nav class="flex gap-4" aria-label="Tabs">
          <button
            v-for="(tab, index) in usageTabs"
            :key="index"
            class="py-2 px-1 text-xs font-medium border-b-2 transition-colors"
            :class="activeUsageTab === index ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
            @click="activeUsageTab = index"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <!-- cURL GET -->
        <div v-if="activeUsageTab === 0">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">GET 请求（推荐）</span>
            <button
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              @click="$emit('copy', getWebhookExample('curl'))"
            >
              复制
            </button>
          </div>
          <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto"><code>{{ getWebhookExample('curl') }}</code></pre>
        </div>

        <!-- POST JSON -->
        <div v-else-if="activeUsageTab === 1">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">POST 请求（JSON）</span>
            <button
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              @click="$emit('copy', getWebhookExample('post'))"
            >
              复制
            </button>
          </div>
          <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto"><code>{{ getWebhookExample('post') }}</code></pre>
        </div>

        <!-- Browser -->
        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">浏览器访问</span>
            <button
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              @click="$emit('copy', getWebhookExample('browser'))"
            >
              复制
            </button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">直接在浏览器地址栏访问：</p>
          <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto"><code>{{ getWebhookExample('browser') }}</code></pre>
        </div>
      </div>

      <!-- Parameters Guide -->
      <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div class="text-xs text-blue-700 dark:text-blue-400">
          <div class="font-medium mb-1">参数说明</div>
          <ul class="space-y-0.5">
            <li>• <code class="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">title</code> - 消息标题（必填）</li>
            <li>• <code class="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">desp</code> - 消息内容（可选）</li>
          </ul>
        </div>
      </div>
    </div>
    </div>

    <!-- No Bindings Message -->
    <div v-else class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
      <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div class="flex items-start gap-3">
          <Icon icon="heroicons:exclamation-triangle" class="text-yellow-600 dark:text-yellow-400 text-xl shrink-0 mt-0.5" />
          <div class="text-sm text-yellow-800 dark:text-yellow-300">
            <div class="font-medium mb-1">需要先绑定微信用户</div>
            <div class="text-xs">请先生成绑定码并在微信公众号中完成绑定，然后才能使用 Webhook 发送消息。</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bind Code Section comment removed -->
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref, computed } from 'vue';
import type { DemoAppWithInfo } from '~/composables/useDemoApps';

interface BindCodeInfo {
  code: string;
  expiresIn: string;
  qrCodeUrl?: string;
}

interface Props {
  app: DemoAppWithInfo;
  bindCode?: BindCodeInfo;
  generatingCode?: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  delete: [id: string];
  generateCode: [id: string];
  copy: [text: string];
}>();

const activeUsageTab = ref(0);

const usageTabs = [
  { label: 'cURL' },
  { label: 'POST' },
  { label: '浏览器' },
];

const hasBindings = computed(() => {
  return (props.app.openIdCount || 0) > 0;
});

const currentStep = computed(() => {
  if (!hasBindings.value) return 2; // Need to bind
  return 3; // Can send messages
});

const completedSteps = computed(() => {
  const completed = [1]; // Step 1 always completed (app created)
  if (hasBindings.value) {
    completed.push(2); // Step 2 completed (user bound)
  }
  return completed;
});

const steps = computed(() => {
  const allSteps = [
    {
      number: 1,
      title: '创建应用',
      description: '应用已创建',
      completed: true,
      active: false,
    },
    {
      number: 2,
      title: '绑定微信',
      description: '生成绑定码并在微信中完成绑定',
      completed: hasBindings.value,
      active: !hasBindings.value,
    },
  ];

  // Only show step 3 when step 2 is completed
  if (hasBindings.value) {
    allSteps.push({
      number: 3,
      title: '发送消息',
      description: '使用 Webhook 发送测试消息',
      completed: false,
      active: true,
    });
  }

  return allSteps;
});

const webhookUrl = computed(() => {
  const origin = window.location.origin;
  return `${origin}/send/${props.app.key}`;
});

function getWebhookExample(type: 'curl' | 'post' | 'browser'): string {
  const url = webhookUrl.value;
  
  switch (type) {
    case 'curl':
      return `curl "${url}?title=测试消息&desp=这是消息内容"`;
    case 'post':
      return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"测试消息","desp":"这是消息内容"}'`;
    case 'browser':
      return `${url}?title=测试消息&desp=这是消息内容`;
    default:
      return url;
  }
}
</script>
