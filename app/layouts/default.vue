<template>
  <div class="admin-shell">
    <div class="admin-shell-layout">
      <div class="admin-shell-sidebar-column">
        <AdminShellSidebar @logout="handleLogout" />
      </div>

      <div class="admin-shell-main">
        <main class="admin-page-main">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from '#imports';
import { showToast } from '~/composables/useToast';
import AdminShellSidebar from '~/features/navigation/components/AdminShellSidebar.vue';
import { useAuthStore } from '~/stores/auth';

const router = useRouter();
const auth = useAuthStore();

function handleLogout() {
  auth.logout();
  showToast('已退出登录', 'success');
  router.push('/admin/login');
}
</script>
