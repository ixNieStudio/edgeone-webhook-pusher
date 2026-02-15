<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
  >
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-md">
        <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
          <h3 class="font-semibold text-gray-800 dark:text-gray-200">{{ title }}</h3>
          <button
            type="button"
            class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="handleCancel"
          >
            <Icon icon="heroicons:x-mark" class="text-xl" />
          </button>
        </div>
        <div class="p-4">
          <div class="flex items-start gap-4">
            <div
              v-if="icon"
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              :class="iconBgClass"
            >
              <Icon :icon="iconName" class="text-xl" :class="iconClass" />
            </div>
            <div>
              <p class="text-gray-600 dark:text-gray-300">{{ message }}</p>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
          <button
            class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="handleCancel"
          >
            {{ cancelText }}
          </button>
          <button
            :disabled="loading"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
            :class="danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'"
            @click="handleConfirm"
          >
            <Icon v-if="loading" icon="heroicons:arrow-path" class="text-base animate-spin" />
            {{ confirmText }}
          </button>
        </div>
      </div>
      <div class="fixed inset-0 bg-black/50 -z-10" @click="handleCancel"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

interface Props {
  title?: string;
  message?: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  message: '确定要执行此操作吗？',
  icon: 'i-heroicons-exclamation-triangle',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
  loading: false,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const isOpen = defineModel<boolean>('open', { default: false });

// Convert i-heroicons-xxx to heroicons:xxx
const iconName = computed(() => {
  if (!props.icon) return '';
  return props.icon.replace('i-heroicons-', 'heroicons:');
});

const iconBgClass = computed(() =>
  props.danger
    ? 'bg-red-100 dark:bg-red-900/30'
    : 'bg-yellow-100 dark:bg-yellow-900/30'
);

const iconClass = computed(() =>
  props.danger
    ? 'text-red-600 dark:text-red-400'
    : 'text-yellow-600 dark:text-yellow-400'
);

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  isOpen.value = false;
  emit('cancel');
}
</script>
