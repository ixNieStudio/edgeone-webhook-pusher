<template>
  <div class="card card-lg">
    <!-- Step Progress -->
    <div class="flex items-center gap-3 mb-4">
      <div
        v-for="step in steps"
        :key="step.number"
        class="flex items-center gap-2"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
          :class="step.completed ? 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400' : step.active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'"
        >
          <Icon v-if="step.completed" icon="heroicons:check" class="text-base" />
          <span v-else>{{ step.number }}</span>
        </div>
        <span class="text-xs font-medium" :class="step.active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'">
          {{ step.title }}
        </span>
        <Icon v-if="step.number < steps.length" icon="heroicons:chevron-right" class="text-gray-300 dark:text-gray-700 text-sm" />
      </div>
    </div>

    <!-- App Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <h3 class="text-lg font-semibold mb-1">{{ app.name }}</h3>
        <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>绑定用户: {{ app.openIdCount || 0 }}</span>
          <span v-if="app.daysRemaining !== undefined" class="flex items-center gap-1">
            <Icon icon="heroicons:clock" class="text-base" />
            剩余 {{ app.daysRemaining }} 天
          </span>
        </div>
        <div class="flex items-center gap-3 mt-2">
          <span class="badge badge-soft-primary badge-sm">
            <Icon icon="heroicons:paper-airplane" class="text-sm" />
            {{ app.pushMode === 'single' ? '单播模式' : '订阅模式' }}
          </span>
          <span class="badge badge-soft-accent badge-sm">
            <Icon icon="heroicons:document-text" class="text-sm" />
            {{ app.messageType === 'template' ? '模板消息' : '文本消息' }}
          </span>
        </div>
      </div>
      <button
        class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        @click="$emit('delete', app.id)"
        title="删除应用"
      >
        <Icon icon="heroicons:trash" class="text-xl" />
      </button>
    </div>

    <!-- Bind Code Section -->
    <DemoBindCodeSection
      :bind-code="bindCode"
      :generating="generatingCode"
      @generate="$emit('generateCode', app.id)"
    />

    <!-- Webhook Usage Section (only show when user is bound) -->
    <DemoWebhookUsageSection
      v-if="hasBindings"
      :webhook-url="webhookUrl"
      @copy="$emit('copy', $event)"
    />

    <!-- No Bindings Message -->
    <div v-else class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
      <div class="alert alert-warning">
        <Icon icon="heroicons:exclamation-triangle" class="text-xl shrink-0" />
        <div class="text-sm">
          <div class="font-medium mb-1">需要先绑定微信用户</div>
          <div class="text-xs">请先生成绑定码并在微信公众号中完成绑定，然后才能使用 Webhook 发送消息。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed } from 'vue';
import type { DemoAppWithInfo } from '~/composables/useDemoApps';

interface BindCodeInfo {
  code: string;
  expiresIn: string;
  qrCodeUrl?: string;
}

interface Props {
  app: DemoAppWithInfo;
  bindCode?: BindCodeInfo;
  generatingCode?: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  delete: [id: string];
  generateCode: [id: string];
  copy: [text: string];
}>();

const hasBindings = computed(() => {
  return (props.app.openIdCount || 0) > 0;
});

const webhookUrl = computed(() => {
  const origin = window.location.origin;
  return `${origin}/send/${props.app.key}`;
});

const steps = computed(() => {
  const allSteps = [
    {
      number: 1,
      title: '创建应用',
      completed: true,
      active: false,
    },
    {
      number: 2,
      title: '绑定微信',
      completed: hasBindings.value,
      active: !hasBindings.value,
    },
  ];

  // Only show step 3 when step 2 is completed
  if (hasBindings.value) {
    allSteps.push({
      number: 3,
      title: '发送消息',
      completed: false,
      active: true,
    });
  }

  return allSteps;
});
</script>
