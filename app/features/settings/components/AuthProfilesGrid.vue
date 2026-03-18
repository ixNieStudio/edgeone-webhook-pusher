<template>
  <div class="grid gap-5 2xl:grid-cols-2">
    <AuthProfileCard
      v-for="profile in profiles"
      :key="profile.id"
      :profile="profile"
      @detail="emit('detail', $event)"
      @edit="emit('edit', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { AuthProfileSummary } from '~/types';
import AuthProfileCard from './AuthProfileCard.vue';

defineProps<{
  profiles: AuthProfileSummary[];
}>();

const emit = defineEmits<{
  (e: 'detail', profileId: string): void;
  (e: 'edit', profile: AuthProfileSummary): void;
}>();
</script>
