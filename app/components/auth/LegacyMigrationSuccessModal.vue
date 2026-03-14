<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div class="fixed inset-0 bg-black/40"></div>
    <div class="relative w-full max-w-xl rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-gray-900 shadow-xl">
      <div class="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/60 px-5 py-4">
        <div class="text-base font-semibold text-emerald-700 dark:text-emerald-300">迁移完成</div>
      </div>
      <div class="px-5 py-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <p>{{ message }}</p>
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
          点击“确认”后页面将自动刷新。
        </div>
      </div>
      <div class="flex justify-end gap-2 border-t border-emerald-200 dark:border-emerald-900/60 px-5 py-4">
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-emerald-700 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
          @click="emit('confirm')"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean;
  message: string;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
}>();
</script>
