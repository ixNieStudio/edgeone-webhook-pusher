<template>
  <div class="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-b border-primary-100 dark:border-primary-800">
    <div class="px-4 md:px-6 lg:px-8 py-8 md:py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Title and Description -->
        <div class="mb-6">
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            微信消息推送系统
          </h1>
          <p class="text-lg text-gray-700 dark:text-gray-300">
            基于微信公众号的消息推送服务，支持模板消息和文本消息，提供简单易用的 Webhook API
          </p>
        </div>

        <!-- Features -->
        <div class="mb-6">
          <h2 class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
            核心功能
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="flex items-start gap-2">
              <Icon icon="heroicons:check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0 mt-0.5" />
              <span class="text-sm text-gray-700 dark:text-gray-300">简单的 Webhook API，支持 GET/POST 请求</span>
            </div>
            <div class="flex items-start gap-2">
              <Icon icon="heroicons:check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0 mt-0.5" />
              <span class="text-sm text-gray-700 dark:text-gray-300">支持模板消息和文本消息两种推送方式</span>
            </div>
            <div class="flex items-start gap-2">
              <Icon icon="heroicons:check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0 mt-0.5" />
              <span class="text-sm text-gray-700 dark:text-gray-300">单播和订阅两种推送模式</span>
            </div>
            <div class="flex items-start gap-2">
              <Icon icon="heroicons:check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0 mt-0.5" />
              <span class="text-sm text-gray-700 dark:text-gray-300">无需服务器，基于 EdgeOne 边缘函数</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-4">
          <a
            href="https://github.com/your-repo/wechat-push"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Icon icon="heroicons:code-bracket" class="text-lg" />
            查看源码
            <Icon icon="heroicons:arrow-top-right-on-square" class="text-base" />
          </a>
          <a
            href="https://github.com/your-repo/wechat-push"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Icon icon="heroicons:star" class="text-lg" />
            Star on GitHub
          </a>
        </div>

        <!-- Quick Usage -->
        <div class="mt-6 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
          <div class="flex items-start gap-3">
            <Icon icon="heroicons:light-bulb" class="text-yellow-600 dark:text-yellow-400 text-xl shrink-0 mt-0.5" />
            <div class="text-sm text-gray-700 dark:text-gray-300">
              <span class="font-medium">快速开始：</span>
              创建应用 → 绑定微信 → 发送消息。体验模式下所有配置已自动完成，3 分钟即可完成测试。
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
</script>
