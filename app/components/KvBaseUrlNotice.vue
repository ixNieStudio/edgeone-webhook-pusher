<template>
  <div class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
    <div class="flex items-start gap-2">
      <Icon icon="heroicons:exclamation-triangle" class="text-yellow-500 text-lg shrink-0 mt-0.5" />
      <div class="text-xs text-yellow-700 dark:text-yellow-400 space-y-2">
        <div>
          <div class="font-medium mb-1">重要：配置 KV_BASE_URL 环境变量</div>
          <div v-if="context === 'channel'">
            当前显示的服务器 URL 基于浏览器地址自动生成，仅供参考。如果您在 EdgeOne 部署此系统，必须配置 <code class="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">KV_BASE_URL</code> 环境变量，否则外部直接访问 Node Functions 接口时将无法获取 KV 地址导致功能失败。
          </div>
          <div v-else>
            当前显示的 Webhook URL 中的域名部分来自浏览器地址，仅供参考。如果您在 EdgeOne 部署此系统，必须配置 <code class="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">KV_BASE_URL</code> 环境变量，否则外部直接访问 <code class="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">/send/*</code> 接口时将无法获取 KV 地址导致推送失败。
          </div>
        </div>
        
        <div>
          <div class="font-medium mb-1">为什么需要配置？</div>
          <div>
            EdgeOne 的 Node Functions 需要通过 Edge Functions 访问 KV 存储，但 Node Functions 无法自动检测公共域名。因此需要手动配置 <code class="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">KV_BASE_URL</code> 环境变量，指定系统部署的完整域名地址。
          </div>
        </div>

        <div>
          <div class="font-medium mb-1">如何配置？</div>
          <div class="mb-1">在 EdgeOne 项目设置的环境变量中添加以下配置：</div>
          <pre class="text-xs bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1.5 rounded overflow-x-auto">KV_BASE_URL=https://your-domain.com</pre>
          <div class="mt-1 text-gray-600 dark:text-gray-500">
            或使用 EdgeOne 默认域名：
          </div>
          <pre class="text-xs bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1.5 rounded overflow-x-auto mt-1">KV_BASE_URL=https://your-project.edgeone.cool</pre>
        </div>

        <div class="text-gray-600 dark:text-gray-500">
          配置后，系统将使用此域名访问 KV 存储，确保所有功能正常工作。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  context: 'channel' | 'app';
}>();
</script>
