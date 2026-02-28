<template>
  <div class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
    <!-- Webhook URL -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Webhook URL
      </label>
      <div class="flex gap-2">
        <input
          :value="webhookUrl"
          readonly
          class="input input-md flex-1"
        />
        <button
          class="btn btn-outline-primary btn-md cursor-pointer"
          @click="$emit('copy', webhookUrl)"
        >
          复制
        </button>
      </div>
    </div>

    <!-- Usage Examples -->
    <div>
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">使用示例</h4>
    
      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700 mb-3">
        <nav class="flex gap-4" aria-label="Tabs">
          <button
            v-for="(tab, index) in tabs"
            :key="index"
            class="py-2 px-1 text-xs font-medium border-b-2 transition-colors cursor-pointer"
            :class="activeTab === index ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
            @click="activeTab = index"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="card card-sm bg-gray-50 dark:bg-gray-800">
        <!-- cURL GET -->
        <div v-if="activeTab === 0">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">GET 请求（推荐）</span>
            <button
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 cursor-pointer"
              @click="$emit('copy', getExample('curl'))"
            >
              复制
            </button>
          </div>
          <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto"><code>{{ getExample('curl') }}</code></pre>
        </div>

        <!-- POST JSON -->
        <div v-else-if="activeTab === 1">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">POST 请求（JSON）</span>
            <button
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 cursor-pointer"
              @click="$emit('copy', getExample('post'))"
            >
              复制
            </button>
          </div>
          <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto"><code>{{ getExample('post') }}</code></pre>
        </div>

        <!-- Browser -->
        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">浏览器访问</span>
            <button
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 cursor-pointer"
              @click="$emit('copy', getExample('browser'))"
            >
              复制
            </button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">直接在浏览器地址栏访问：</p>
          <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto"><code>{{ getExample('browser') }}</code></pre>
        </div>
      </div>

      <!-- Parameters Guide -->
      <div class="mt-3 alert alert-info">
        <Icon icon="heroicons:information-circle" class="text-xl shrink-0" />
        <div class="text-xs">
          <div class="font-medium mb-1">参数说明</div>
          <ul class="space-y-0.5">
            <li>• <code class="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">title</code> - 消息标题（必填）</li>
            <li>• <code class="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">desp</code> - 消息内容（可选）</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref } from 'vue';

interface Props {
  webhookUrl: string;
}

const props = defineProps<Props>();

defineEmits<{
  copy: [text: string];
}>();

const activeTab = ref(0);

const tabs = [
  { label: 'cURL' },
  { label: 'POST' },
  { label: '浏览器' },
];

function getExample(type: 'curl' | 'post' | 'browser'): string {
  const url = props.webhookUrl;
  
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
