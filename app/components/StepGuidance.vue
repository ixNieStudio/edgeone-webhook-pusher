<template>
  <div class="mb-6">
    <!-- Desktop: Horizontal -->
    <div class="hidden md:flex items-center justify-between">
      <div
        v-for="(step, index) in steps"
        :key="step.number"
        class="flex items-center flex-1"
      >
        <!-- Step Circle -->
        <div class="flex items-center">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors"
            :class="getStepClasses(step)"
            :aria-label="`Step ${step.number}: ${step.title}`"
          >
            <Icon
              v-if="step.completed"
              icon="heroicons:check"
              class="text-lg text-white"
            />
            <span
              v-else
              class="text-sm font-semibold"
              :class="step.active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'"
            >
              {{ step.number }}
            </span>
          </div>
          <div class="ml-3">
            <div
              class="text-sm font-medium"
              :class="step.completed || step.active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'"
            >
              {{ step.title }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ step.description }}
            </div>
          </div>
        </div>

        <!-- Connecting Line -->
        <div
          v-if="index < steps.length - 1"
          class="flex-1 h-0.5 mx-4"
          :class="step.completed ? 'bg-primary-600 dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-700'"
        ></div>
      </div>
    </div>

    <!-- Mobile: Vertical -->
    <div class="md:hidden space-y-4">
      <div
        v-for="(step, index) in steps"
        :key="step.number"
        class="flex items-start gap-3"
      >
        <!-- Step Circle and Line -->
        <div class="flex flex-col items-center">
          <div
            class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors shrink-0"
            :class="getStepClasses(step)"
            :aria-label="`Step ${step.number}: ${step.title}`"
          >
            <Icon
              v-if="step.completed"
              icon="heroicons:check"
              class="text-base text-white"
            />
            <span
              v-else
              class="text-xs font-semibold"
              :class="step.active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'"
            >
              {{ step.number }}
            </span>
          </div>
          <div
            v-if="index < steps.length - 1"
            class="w-0.5 flex-1 min-h-[2rem] mt-2"
            :class="step.completed ? 'bg-primary-600 dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-700'"
          ></div>
        </div>

        <!-- Step Content -->
        <div class="flex-1 pb-4">
          <div
            class="text-sm font-medium"
            :class="step.completed || step.active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'"
          >
            {{ step.title }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ step.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

interface Step {
  number: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

interface Props {
  steps: Step[];
}

defineProps<Props>();

function getStepClasses(step: Step): string {
  if (step.completed) {
    return 'bg-primary-600 dark:bg-primary-500 border-primary-600 dark:border-primary-500';
  }
  if (step.active) {
    return 'bg-white dark:bg-gray-900 border-primary-600 dark:border-primary-400';
  }
  return 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700';
}
</script>
