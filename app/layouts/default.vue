<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-56',
        'lg:relative',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-2 p-4 cursor-pointer border-b border-gray-200 dark:border-gray-800" @click="sidebarCollapsed = !sidebarCollapsed">
        <Icon icon="heroicons:bolt" class="text-2xl text-blue-600 shrink-0" />
        <span v-if="!sidebarCollapsed" class="font-semibold text-sm truncate">Webhook Pusher</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            route.path === item.to
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          ]"
          @click="mobileMenuOpen = false"
        >
          <Icon :icon="item.icon" class="text-lg shrink-0" />
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Footer -->
      <div class="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <button
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          @click="toggleColorMode"
        >
          <Icon :icon="isDark ? 'heroicons:sun' : 'heroicons:moon'" class="text-lg" />
          <span v-if="!sidebarCollapsed">{{ isDark ? '浅色模式' : '深色模式' }}</span>
        </button>
        <button
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          @click="handleLogout"
        >
          <Icon icon="heroicons:arrow-right-on-rectangle" class="text-lg" />
          <span v-if="!sidebarCollapsed">退出登录</span>
        </button>
      </div>
    </aside>

    <!-- Mobile overlay -->
    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      @click="mobileMenuOpen = false"
    />

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile header -->
      <header class="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" @click="mobileMenuOpen = true">
          <Icon icon="heroicons:bars-3" class="text-xl" />
        </button>
        <span class="font-medium">{{ pageTitle }}</span>
      </header>

      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { showToast } from '~/composables/useToast';
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sidebarCollapsed = ref(false);
const mobileMenuOpen = ref(false);
const isDark = ref(false);

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': '仪表盘',
    '/channels': '渠道管理',
    '/apps': '应用管理',
    '/messages': '消息历史',
    '/api-docs': 'API 文档',
    '/settings': '设置',
  };
  return titles[route.path] || 'Webhook Pusher';
});

const menuItems = [
  { label: '仪表盘', icon: 'heroicons:home', to: '/' },
  { label: '渠道管理', icon: 'heroicons:signal', to: '/channels' },
  { label: '应用管理', icon: 'heroicons:cube', to: '/apps' },
  { label: '消息历史', icon: 'heroicons:chat-bubble-left-right', to: '/messages' },
  { label: 'API 文档', icon: 'heroicons:book-open', to: '/api-docs' },
  { label: '设置', icon: 'heroicons:cog-6-tooth', to: '/settings' },
];

function toggleColorMode() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('color-mode', isDark.value ? 'dark' : 'light');
}

function handleLogout() {
  auth.logout();
  showToast('已退出登录', 'success');
  router.push('/login');
}

onMounted(() => {
  const saved = localStorage.getItem('color-mode');
  isDark.value = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark.value);
  
  if (window.innerWidth < 1024) {
    sidebarCollapsed.value = true;
  }
});
</script>
