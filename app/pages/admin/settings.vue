<template>
  <NuxtPage />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: [
    (to) => {
      if (to.path === '/admin/settings') {
        return navigateTo('/admin/settings/general', { replace: true });
      }

      return;
    },
  ],
});
</script>
