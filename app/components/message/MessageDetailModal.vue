<template>
  <div v-if="message" class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto">
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-2xl max-h-[80vh]">
        <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
          <h3 class="font-semibold text-gray-800 dark:text-gray-200">消息详情</h3>
          <button
            type="button"
            class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="$emit('close')"
          >
            <Icon icon="heroicons:x-mark" class="text-xl" />
          </button>
        </div>
        <div class="p-4 overflow-y-auto">
          <div class="space-y-4">
            <!-- Direction & Type -->
            <div class="flex items-center gap-4">
              <span :class="getDirectionClass(message.direction)" class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full">
                <Icon :icon="getDirectionIcon(message.direction)" class="text-sm" />
                {{ message.direction === 'outbound' ? '发出' : '收到' }}
              </span>
              <span :class="getTypeClass(message.type)" class="px-2 py-0.5 text-xs font-medium rounded-full">
                {{ getTypeLabel(message.type) }}
              </span>
            </div>

            <!-- Basic Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">消息 ID</label>
                <p class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ message.id }}</p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">渠道 ID</label>
                <p class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ message.channelId }}</p>
              </div>
              <div v-if="message.appId">
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">应用</label>
                <p class="text-sm text-gray-900 dark:text-gray-100">
                  {{ message.appName || message.appId }}
                </p>
              </div>
              <div v-if="message.openId">
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">用户</label>
                <div class="flex items-center gap-2">
                  <img
                    v-if="message.userAvatar"
                    :src="message.userAvatar"
                    class="w-8 h-8 rounded-full object-cover"
                    :alt="message.userNickname || '用户'"
                  />
                  <div v-else class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700">
                    <Icon icon="heroicons:user" class="text-gray-400" />
                  </div>
                  <div>
                    <p v-if="message.userNickname" class="text-sm text-gray-900 dark:text-gray-100">{{ message.userNickname }}</p>
                    <p class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">{{ message.openId }}</p>
                  </div>
                </div>
              </div>
              <div v-if="message.event">
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">事件类型</label>
                <p class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ message.event }}</p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">时间</label>
                <p class="text-sm text-gray-900 dark:text-gray-100">{{ formatDateTime(message.createdAt) }}</p>
              </div>
            </div>

            <!-- Title -->
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">标题</label>
              <p class="text-sm text-gray-900 dark:text-gray-100">{{ message.title }}</p>
            </div>

            <!-- Content -->
            <div v-if="message.desp">
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">内容</label>
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{{ message.desp }}</div>
            </div>

            <!-- Delivery Results (outbound only) -->
            <div v-if="message.direction === 'outbound' && message.results && message.results.length > 0">
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-2">发送结果</label>
              <div class="space-y-2">
                <div
                  v-for="(result, idx) in message.results"
                  :key="idx"
                  class="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div class="flex items-center justify-center w-6 h-6 rounded-full" :class="result.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
                    <Icon
                      :icon="result.success ? 'heroicons:check' : 'heroicons:x-mark'"
                      :class="result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                      class="text-sm"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">{{ result.openId }}</p>
                    <p v-if="result.error" class="text-xs text-red-500">{{ result.error }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="fixed inset-0 bg-black/50 -z-10" @click="$emit('close')"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Message } from '~/types';

interface Props {
  message: Message | null;
}

defineProps<Props>();
defineEmits<{
  close: [];
}>();

const { getDirectionIcon, getDirectionClass, getTypeLabel, getTypeClass, formatDateTime } = useMessageFormatting();
</script>
