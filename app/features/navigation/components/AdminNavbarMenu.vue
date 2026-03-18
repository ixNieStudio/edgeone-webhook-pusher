<template>
  <div ref="root" class="relative">
    <button
      class="admin-navbar-menu-trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      @click.stop="toggleOpen"
    >
      <AppIcon name="menu" :size="16" />
      <span class="hidden xl:inline">更多</span>
    </button>

    <transition
      enter-active-class="transition duration-160 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-120 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div v-if="open" class="admin-navbar-menu-panel" role="menu">
        <a
          :href="repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="admin-navbar-menu-item"
          role="menuitem"
          @click="close"
        >
          <AppIcon name="github" :size="16" />
          <span>项目仓库</span>
        </a>

        <button class="admin-navbar-menu-item" type="button" role="menuitem" @click="handleLogout">
          <AppIcon name="logout" :size="16" />
          <span>退出登录</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from '~/shared/icons/AppIcon.vue';

const props = defineProps<{
  repoUrl: string;
}>();

const emit = defineEmits<{
  (e: 'logout'): void;
}>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function close() {
  open.value = false;
}

function toggleOpen() {
  open.value = !open.value;
}

function handleLogout() {
  close();
  emit('logout');
}

function handleDocumentClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) {
    close();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
});
</script>
