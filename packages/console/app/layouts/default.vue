<template>
  <t-layout>
    <t-aside width="220px">
      <div class="logo">
        <h2>EdgeOne Webhook Pusher</h2>
      </div>
      <t-menu
        :value="currentRoute"
        theme="light"
        @change="handleMenuChange"
      >
        <t-menu-item value="/">
          <template #icon><t-icon name="dashboard" /></template>
          仪表盘
        </t-menu-item>
        <t-menu-item value="/channels">
          <template #icon><t-icon name="server" /></template>
          渠道管理
        </t-menu-item>
        <t-menu-item value="/messages">
          <template #icon><t-icon name="mail" /></template>
          消息历史
        </t-menu-item>
        <t-menu-item value="/settings">
          <template #icon><t-icon name="setting" /></template>
          设置
        </t-menu-item>
      </t-menu>
    </t-aside>
    <t-layout>
      <t-header>
        <div class="header-content">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
      </t-header>
      <t-content class="main-content">
        <slot />
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const currentRoute = computed(() => route.path);

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': '仪表盘',
    '/channels': '渠道管理',
    '/messages': '消息历史',
    '/settings': '设置',
  };
  return titles[route.path] || 'EdgeOne Webhook Pusher';
});

function handleMenuChange(value: string | number) {
  router.push(String(value));
}
</script>

<style scoped>
.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid var(--td-component-border);
}

.logo h2 {
  margin: 0;
  font-size: 16px;
  color: var(--td-text-color-primary);
}

.header-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
}

.main-content {
  padding: 24px;
  background: var(--td-bg-color-page);
  min-height: calc(100vh - 64px);
}
</style>
