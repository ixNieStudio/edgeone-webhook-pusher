<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
      <Icon :icon="iconName" class="text-3xl text-gray-400 dark:text-gray-500" />
    </div>
    <p class="text-gray-500 dark:text-gray-400 mb-4">{{ message }}</p>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{
  icon?: string;
  message: string;
}>();

// Convert i-heroicons-xxx to heroicons:xxx
const iconName = computed(() => {
  if (!props.icon) return 'heroicons:document';
  return props.icon.replace('i-heroicons-', 'heroicons:');
});
</script>
