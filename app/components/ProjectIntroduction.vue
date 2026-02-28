<template>
  <div class="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-b border-primary-100 dark:border-primary-800">
    <div class="px-4 md:px-6 lg:px-8 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
          微信消息推送系统
        </h1>
        <p class="text-lg text-gray-700 dark:text-gray-300 mb-6">
          基于微信公众号的消息推送服务，支持模板消息和文本消息，提供简单易用的 Webhook API
        </p>
        <!-- Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
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
        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-4">
          <a
            href="https://github.com/ixNieStudio/edgeone-webhook-pusher"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-solid-primary btn-md"
          >
            <Icon icon="heroicons:code-bracket" class="text-lg" />
            查看源码
            <Icon icon="heroicons:arrow-top-right-on-square" class="text-base" />
          </a>
          <a
            href="https://github.com/ixNieStudio/edgeone-webhook-pusher"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img 
              src="https://img.shields.io/github/stars/ixNieStudio/edgeone-webhook-pusher?style=social" 
              alt="GitHub stars"
              class="h-8"
            />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue';
</script>
