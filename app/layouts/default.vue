<template>
  <div class="flex h-screen bg-[var(--bg-secondary)]">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--bg-elevated)] border-r border-[var(--border-default)] transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-56',
        'lg:relative',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-2 p-4 cursor-pointer border-b border-[var(--border-default)]" @click="sidebarCollapsed = !sidebarCollapsed">
        <Icon icon="tabler:webhook" class="text-2xl text-primary-500 shrink-0" />
        <span v-if="!sidebarCollapsed" class="font-semibold text-sm truncate text-[var(--text-primary)]">Webhook Pusher</span>
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
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-[var(--text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
          ]"
          @click="mobileMenuOpen = false"
        >
          <Icon :icon="item.icon" class="text-lg shrink-0" />
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Footer -->
      <div class="p-2 border-t border-[var(--border-default)] space-y-1">
        <button
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          @click="handleToggleTheme"
        >
          <Icon :icon="isDark ? 'tabler:sun' : 'tabler:moon'" class="text-lg" />
          <span v-if="!sidebarCollapsed">{{ isDark ? '浅色模式' : '深色模式' }}</span>
        </button>
        <button
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          @click="handleLogout"
        >
          <Icon icon="tabler:logout" class="text-lg" />
          <span v-if="!sidebarCollapsed">退出登录</span>
        </button>
        <a 
          href="https://github.com/ixNieStudio/edgeone-webhook-pusher" 
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Icon icon="tabler:brand-github" class="text-lg" />
          <span v-if="!sidebarCollapsed">项目地址</span>
        </a>
        <a 
          href="https://edgeone.ai/?from=github" 
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center justify-center px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <template v-if="!sidebarCollapsed">
            <span class="whitespace-nowrap mr-2">Powered by</span>
            <img src="https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png" alt="EdgeOne" class="h-4 shrink-0" />
          </template>
          <span v-else class="text-[10px]">EdgeOne</span>
        </a>
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
      <header class="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <button class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800" @click="mobileMenuOpen = true">
          <Icon icon="tabler:menu-2" class="text-xl text-[var(--text-primary)]" />
        </button>
        <span class="font-medium text-[var(--text-primary)]">{{ pageTitle }}</span>
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
const { isDark, toggle, init } = useTheme();
const config = useRuntimeConfig();

const sidebarCollapsed = ref(false);
const mobileMenuOpen = ref(false);

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

// 根据体验模式和当前路径动态生成菜单项
const menuItems = computed(() => {
  const allItems = [
    { label: '仪表盘', icon: 'tabler:dashboard', to: '/' },
    { label: '渠道管理', icon: 'tabler:broadcast', to: '/channels' },
    { label: '应用管理', icon: 'tabler:apps', to: '/apps' },
    { label: '消息历史', icon: 'tabler:message-2', to: '/messages' },
    { label: 'API 文档', icon: 'tabler:file-code', to: '/api-docs' },
    { label: '设置', icon: 'tabler:settings', to: '/settings' },
  ];

  // 在体验模式下，如果在根路径（体验前端），隐藏渠道管理
  const isDemoMode = config.public.demoMode;
  const isOnRootPath = !route.path.startsWith('/admin');
  
  if (isDemoMode && isOnRootPath) {
    return allItems.filter(item => item.to !== '/channels');
  }
  
  return allItems;
});

function handleToggleTheme() {
  toggle();
}

function handleLogout() {
  auth.logout();
  showToast('已退出登录', 'success');
  router.push('/login');
}

onMounted(() => {
  init();
  
  if (window.innerWidth < 1024) {
    sidebarCollapsed.value = true;
  }
});
</script>
