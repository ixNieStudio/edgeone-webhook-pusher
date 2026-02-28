<template>
  <div class="flex h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
        'bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl',
        'border-r border-neutral-200/50 dark:border-neutral-800/50',
        'shadow-xl shadow-neutral-900/5 dark:shadow-black/20',
        sidebarCollapsed ? 'w-16' : 'w-64',
        'lg:relative',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-neutral-200/50 dark:border-neutral-800/50 min-h-[73px]">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/30 dark:shadow-primary-500/20">
          <Icon icon="tabler:webhook" class="text-xl text-white" />
        </div>
        <span v-if="!sidebarCollapsed" class="font-bold text-base text-neutral-900 dark:text-white tracking-tight">Webhook Pusher</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group relative',
            route.path === item.to
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 dark:shadow-primary-500/20'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white'
          ]"
          @click="mobileMenuOpen = false"
        >
          <Icon
            :icon="item.icon"
            :class="[
              'text-xl shrink-0 transition-transform duration-200',
              route.path === item.to ? 'scale-110' : 'group-hover:scale-105'
            ]"
          />
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-neutral-200/50 dark:border-neutral-800/50 space-y-1.5">
        <button
          class="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 cursor-pointer group"
          @click="handleToggleTheme"
        >
          <Icon
            :icon="isDark ? 'tabler:sun' : 'tabler:moon'"
            class="text-xl transition-transform duration-200 group-hover:scale-105"
          />
          <span v-if="!sidebarCollapsed">{{ isDark ? '浅色模式' : '深色模式' }}</span>
        </button>
        <button
          class="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 hover:text-danger-600 dark:hover:text-danger-400 transition-all duration-200 cursor-pointer group"
          @click="handleLogout"
        >
          <Icon icon="tabler:logout" class="text-xl transition-transform duration-200 group-hover:scale-105" />
          <span v-if="!sidebarCollapsed">退出登录</span>
        </button>
        <a
          href="https://github.com/ixNieStudio/edgeone-webhook-pusher"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 cursor-pointer group"
        >
          <Icon icon="tabler:brand-github" class="text-xl transition-transform duration-200 group-hover:scale-105" />
          <span v-if="!sidebarCollapsed">项目地址</span>
        </a>
        <a
          href="https://edgeone.ai/?from=github"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center px-3.5 py-3 rounded-xl text-xs text-neutral-500 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all duration-200 cursor-pointer group"
        >
          <template v-if="!sidebarCollapsed">
            <span class="whitespace-nowrap mr-2">Powered by</span>
            <img
              src="https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png"
              alt="EdgeOne"
              class="h-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </template>
          <span v-else class="text-[10px]">EdgeOne</span>
        </a>
      </div>
    </aside>

    <!-- Mobile overlay -->
    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
      @click="mobileMenuOpen = false"
    />

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile header -->
      <header class="lg:hidden flex items-center gap-3 px-4 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
        <button
          class="p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all duration-200 cursor-pointer active:scale-95"
          @click="mobileMenuOpen = true"
        >
          <Icon icon="tabler:menu-2" class="text-xl text-neutral-900 dark:text-white" />
        </button>
        <span class="font-bold text-neutral-900 dark:text-white tracking-tight">{{ pageTitle }}</span>
      </header>

      <main class="flex-1 overflow-auto p-6 lg:p-8">
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

const sidebarCollapsed = ref(false);
const mobileMenuOpen = ref(false);

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/admin/channels': '渠道管理',
    '/admin/apps': '应用管理',
    '/admin/messages': '消息历史',
    '/admin/api-docs': 'API 文档',
    '/admin/settings': '设置',
  };
  return titles[route.path] || 'Webhook Pusher';
});

// 管理后台菜单项（统一使用 /admin/* 路径）
const menuItems = computed(() => {
  return [
    { label: '渠道管理', icon: 'tabler:broadcast', to: '/admin/channels' },
    { label: '应用管理', icon: 'tabler:apps', to: '/admin/apps' },
    { label: '消息历史', icon: 'tabler:message-2', to: '/admin/messages' },
    { label: 'API 文档', icon: 'tabler:file-code', to: '/admin/api-docs' },
    { label: '设置', icon: 'tabler:settings', to: '/admin/settings' },
  ];
});

function handleToggleTheme() {
  toggle();
}

function handleLogout() {
  auth.logout();
  showToast('已退出登录', 'success');
  router.push('/admin/login');
}

onMounted(() => {
  init();
  
  if (window.innerWidth < 1024) {
    sidebarCollapsed.value = true;
  }
});
</script>
