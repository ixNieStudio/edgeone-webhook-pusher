<template>
  <span
    :class="wrapperClass"
    :style="styleObject"
    class="inline-flex shrink-0 items-center justify-center rounded-[0.72rem]"
    aria-hidden="true"
  >
    <Icon :icon="iconName" class="size-[70%]" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { DeliveryType } from '~/types';

const props = withDefaults(defineProps<{
  type: DeliveryType;
  size?: number;
  class?: string;
}>(), {
  size: 18,
  class: '',
});

const iconName = computed(() => ({
  wechat: 'simple-icons:wechat',
  work_wechat: 'tdesign:logo-wecom-filled',
  dingtalk: 'ant-design:dingtalk-circle-filled',
  feishu: 'icon-park-outline:new-lark',
}[props.type]));

const wrapperClass = computed(() => {
  const tone = {
    wechat: 'channel-tone channel-tone-wechat',
    work_wechat: 'channel-tone channel-tone-work-wechat',
    dingtalk: 'channel-tone channel-tone-dingtalk',
    feishu: 'channel-tone channel-tone-feishu',
  }[props.type];

  return [tone, props.class].filter(Boolean).join(' ');
});

const styleObject = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>
