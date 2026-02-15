<template>
  <button
    class="btn btn-sm btn-ghost-neutral"
    @click="toggle"
    :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
  >
    <Icon 
      :icon="isDark ? 'heroicons:sun' : 'heroicons:moon'" 
      class="text-lg"
    />
  </button>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

const { isDark, toggle } = useTheme();
</script>
