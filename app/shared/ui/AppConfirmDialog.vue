<template>
  <TransitionRoot :show="open" as="template">
    <Dialog class="relative z-50" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-center justify-center px-4">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="translate-y-2 opacity-0 sm:translate-y-0 sm:scale-95"
          enter-to="translate-y-0 opacity-100 sm:scale-100"
          leave="ease-in duration-150"
          leave-from="translate-y-0 opacity-100 sm:scale-100"
          leave-to="translate-y-2 opacity-0 sm:translate-y-0 sm:scale-95"
        >
          <DialogPanel class="surface-panel-strong w-full max-w-md p-5">
            <div class="flex items-start gap-3">
              <div :class="toneClass" class="flex size-10 shrink-0 items-center justify-center rounded-xl">
                <AppIcon :name="tone === 'danger' ? 'alert' : 'sparkles'" :size="20" />
              </div>
              <div class="space-y-2">
                <DialogTitle class="text-app text-base font-semibold">
                  {{ title }}
                </DialogTitle>
                <p class="text-subtle text-[13px] leading-5">
                  {{ description }}
                </p>
              </div>
            </div>

            <div class="mt-5 flex justify-end gap-2.5">
              <button class="button-secondary" type="button" @click="emit('close')">
                取消
              </button>
              <button :class="confirmClass" type="button" @click="emit('confirm')">
                {{ confirmLabel }}
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue';
import { computed } from 'vue';
import AppIcon from '~/shared/icons/AppIcon.vue';

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}>(), {
  confirmLabel: '确认',
  tone: 'danger',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

const toneClass = computed(() => (
  props.tone === 'danger'
    ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
    : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
));

const confirmClass = computed(() => (
  props.tone === 'danger' ? 'button-danger' : 'button-primary'
));
</script>
