<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: [
    () => navigateTo('/admin/apps', { replace: true }),
  ],
});
</script>
