<template>
  <aside class="admin-shell-sidebar">
    <div class="admin-shell-brand">
      <NuxtLink to="/admin/apps" class="admin-shell-brand-link">
        <div class="admin-shell-brand-mark">
          <img
            src="/logo.png"
            alt="EdgeOne MCP Pusher"
            class="h-8 w-8 object-contain"
          />
        </div>
      </NuxtLink>
    </div>

    <div class="admin-shell-nav-section">
      <nav class="admin-shell-nav-list" aria-label="主导航">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :class="isActive(item) ? 'admin-shell-nav-link-active' : 'admin-shell-nav-link-idle'"
          class="admin-shell-nav-link"
          :aria-current="isActive(item) ? 'page' : undefined"
          :aria-label="item.label"
          :title="item.label"
        >
          <div class="admin-shell-nav-icon">
            <AppIcon :name="item.icon" :size="17" />
          </div>
          <span class="sr-only">{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div class="admin-shell-sidebar-footer">
      <button
        class="icon-button admin-shell-footer-icon"
        type="button"
        :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
        :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
        @click="toggleTheme"
      >
        <AppIcon :name="isDark ? 'sun' : 'moon'" :size="17" />
      </button>

      <a
        href="https://github.com/ixNieStudio/edgeone-mcp-pusher"
        target="_blank"
        rel="noopener noreferrer"
        class="icon-button admin-shell-footer-icon"
        aria-label="项目仓库"
        title="项目仓库"
      >
        <AppIcon name="github" :size="16" />
        <span class="sr-only">项目仓库</span>
      </a>

      <button
        class="icon-button admin-shell-footer-icon"
        type="button"
        aria-label="退出登录"
        title="退出登录"
        @click="$emit('logout')"
      >
        <AppIcon name="logout" :size="16" />
        <span class="sr-only">退出登录</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from '#imports';
import { useTheme } from '~/composables/useTheme';
import { ADMIN_NAVIGATION, type AdminNavigationItem } from '~/features/navigation/constants';
import AppIcon from '~/shared/icons/AppIcon.vue';

defineEmits<{
  (e: 'logout'): void;
}>();

const route = useRoute();
const { isDark, toggle } = useTheme();

const navigation = ADMIN_NAVIGATION;

function isActive(item: AdminNavigationItem) {
  return route.path === item.to || route.path.startsWith(item.prefix);
}

function toggleTheme() {
  toggle();
}
</script>
