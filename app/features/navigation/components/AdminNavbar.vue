<template>
  <header class="admin-navbar-shell fixed inset-x-0 top-0 z-40">
    <div class="mx-auto max-w-[1480px] px-3">
      <div class="flex h-[4.25rem] items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3 lg:gap-6">
          <NuxtLink to="/admin/apps" class="flex min-w-0 items-center gap-3">
            <div
              class="brand-badge-surface flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-[var(--app-border)] p-1 shadow-[var(--shadow-panel-soft)]"
            >
              <img
                src="/logo.png"
                alt="EdgeOne MCP Pusher"
                class="h-6 w-6 object-contain"
              />
            </div>

            <div class="min-w-0 leading-tight">
              <div class="text-app truncate text-[13px] font-semibold tracking-[-0.01em]">
                EdgeOne MCP Pusher
              </div>
              <div class="truncate text-[11px] text-subtle">
                Admin Console
              </div>
            </div>
          </NuxtLink>

          <nav class="nav-pill-group hidden items-center gap-1 rounded-[0.85rem] p-1 lg:flex">
            <NuxtLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              :class="[
                'rounded-[0.68rem] px-3 py-1.5 text-[13px] font-semibold transition-colors',
                isActive(item) ? 'nav-pill-active' : 'nav-pill-idle',
              ]"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <button
            class="icon-button"
            type="button"
            :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
            @click="toggleTheme"
          >
            <AppIcon :name="isDark ? 'sun' : 'moon'" :size="17" />
          </button>

          <AdminNavbarMenu
            repo-url="https://github.com/ixNieStudio/edgeone-mcp-pusher"
            @logout="$emit('logout')"
          />
        </div>
      </div>

      <nav class="border-t border-[var(--app-border)] py-2.5 lg:hidden">
        <div class="overflow-x-auto">
          <div class="nav-pill-group flex min-w-max items-center gap-1 rounded-[0.85rem] p-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              :class="[
                'rounded-[0.68rem] px-3 py-1.5 text-[13px] font-semibold transition-colors',
                isActive(item) ? 'nav-pill-active' : 'nav-pill-idle',
              ]"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from '#imports';
import { useTheme } from '~/composables/useTheme';
import { ADMIN_NAVIGATION, type AdminNavigationItem } from '~/features/navigation/constants';
import AdminNavbarMenu from '~/features/navigation/components/AdminNavbarMenu.vue';
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
