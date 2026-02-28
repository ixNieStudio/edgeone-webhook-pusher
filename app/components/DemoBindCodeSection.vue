<template>
  <div class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">用户绑定</h4>
      <button
        :disabled="generating"
        class="btn btn-solid-primary btn-sm cursor-pointer"
        @click="$emit('generate')"
      >
        <Icon v-if="generating" icon="heroicons:arrow-path" class="text-base animate-spin" />
        生成绑定码
      </button>
    </div>
    
    <div v-if="bindCode" class="card card-md bg-gray-50 dark:bg-gray-800">
      <!-- QR Code -->
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

      <!-- Bind Code -->
      <div class="text-center" :class="{ 'mb-3': !bindCode.qrCodeUrl }">
        <div class="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400 tracking-wider">
          {{ bindCode.code }}
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ bindCode.expiresIn }}
        </p>
      </div>

      <!-- Manual Binding Instructions -->
      <p class="text-xs text-gray-600 dark:text-gray-400 text-center" :class="{ 'mt-3': bindCode.qrCodeUrl }">
        <span v-if="bindCode.qrCodeUrl">或</span>在微信公众号中发送 "绑定 {{ bindCode.code }}" 完成绑定
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

interface BindCodeInfo {
  code: string;
  expiresIn: string;
  qrCodeUrl?: string;
}

interface Props {
  bindCode?: BindCodeInfo;
  generating?: boolean;
}

defineProps<Props>();

defineEmits<{
  generate: [];
}>();
</script>
