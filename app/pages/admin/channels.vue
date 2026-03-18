<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: [
    () => navigateTo('/admin/settings/auth-profiles', { replace: true }),
  ],
});
</script>
