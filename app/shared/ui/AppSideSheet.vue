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

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-6">
            <TransitionChild
              as="template"
              enter="transform transition ease-out duration-200"
              enter-from="translate-x-full"
              enter-to="translate-x-0"
              leave="transform transition ease-in duration-150"
              leave-from="translate-x-0"
              leave-to="translate-x-full"
            >
              <DialogPanel class="pointer-events-auto w-screen max-w-[42rem]">
                <div class="surface-panel-strong flex h-full flex-col rounded-none border-l sm:rounded-l-[1.25rem]">
                  <div class="flex items-start justify-between gap-3 border-b border-[var(--app-border)] px-5 py-5 sm:px-6">
                    <div class="space-y-1">
                      <DialogTitle class="text-app text-base font-semibold">
                        {{ title }}
                      </DialogTitle>
                      <p v-if="description" class="text-subtle text-[13px]">
                        {{ description }}
                      </p>
                    </div>
                    <button class="icon-button" type="button" @click="emit('close')">
                      <AppIcon name="close" :size="18" />
                    </button>
                  </div>
                  <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    <slot />
                  </div>
                  <div v-if="$slots.footer" class="border-t border-[var(--app-border)] px-5 py-4 sm:px-6">
                    <slot name="footer" />
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
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
import AppIcon from '~/shared/icons/AppIcon.vue';

defineProps<{
  open: boolean;
  title: string;
  description?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>
