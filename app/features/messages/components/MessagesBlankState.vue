<template>
  <div class="flex h-full min-h-[18rem] flex-col items-center justify-center px-6 py-10 text-center">
    <div class="empty-state-icon flex size-12 items-center justify-center rounded-2xl">
      <AppIcon :name="mode === 'list' ? 'messages' : 'eye'" :size="22" />
    </div>
    <h3 class="text-app mt-4 text-base font-semibold">{{ title }}</h3>
    <p class="mt-2 max-w-sm text-sm leading-6 text-subtle">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '~/shared/icons/AppIcon.vue';

const props = defineProps<{
  mode: 'list' | 'preview';
}>();

const title = computed(() => props.mode === 'list' ? '当前没有匹配的消息' : '从左侧选择一条消息');
const description = computed(() => props.mode === 'list'
  ? '切换方向、应用或时间范围后，这里会出现当前工作区的消息记录。'
  : '右侧将显示消息内容、跳转信息和投递结果，方便集中排查。');
</script>
