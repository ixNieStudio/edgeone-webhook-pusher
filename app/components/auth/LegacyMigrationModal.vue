<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div class="fixed inset-0 bg-black/40" @click="handleClose"></div>
    <div class="relative w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
      <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-4">
        <div class="text-base font-semibold text-gray-900 dark:text-gray-100">发现旧 KV 数据</div>
        <button
          class="rounded-lg p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          :disabled="running"
          @click="handleClose"
        >
          <Icon icon="heroicons:x-mark" class="text-xl" />
        </button>
      </div>
      <div class="px-5 py-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <p>检测到旧 KV 命名空间中仍有数据。请输入 <code>BUILD_KEY</code> 并开始迁移到新的 <code>PUSHER_KV</code>。</p>
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          迁移完成后即可解绑旧的 KV 命名空间。消息仅保留最近 50 条。
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">BUILD_KEY</label>
          <input
            class="input input-sm w-full"
            type="password"
            placeholder="请输入 BUILD_KEY"
            :value="buildKey"
            :disabled="running"
            @input="handleInput"
          />
          <p class="mt-1 text-[11px] text-gray-400">仅用于本次迁移请求，不会存储。</p>
        </div>
        <div v-if="error" class="alert alert-danger text-xs">
          <Icon icon="tabler:alert-circle" class="shrink-0 text-base" />
          <span>{{ error }}</span>
        </div>
      </div>
      <div class="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 px-5 py-4">
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="running"
          @click="handleClose"
        >
          取消
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSubmit"
          @click="handleConfirm"
        >
          <Icon v-if="running" icon="svg-spinners:ring-resize" />
          <Icon v-else icon="tabler:transfer" />
          {{ running ? '迁移中...' : '开始迁移' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  open: boolean;
  running: boolean;
  error: string;
  buildKey: string;
}>();

const emit = defineEmits<{
  (e: 'update:buildKey', value: string): void;
  (e: 'confirm'): void;
  (e: 'close'): void;
}>();

const canSubmit = computed(() => props.buildKey.trim().length > 0 && !props.running);

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  emit('update:buildKey', target?.value || '');
}

function handleConfirm() {
  if (!canSubmit.value) return;
  emit('confirm');
}

function handleClose() {
  if (props.running) return;
  emit('close');
}
</script>
