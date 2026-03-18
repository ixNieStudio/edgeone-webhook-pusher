<template>
  <svg
    :class="customClass"
    :style="styleObject"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'apps'">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </template>
    <template v-else-if="name === 'messages'">
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M6 4h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 3V7a3 3 0 0 1 3-3Z" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V22a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.57 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.66 8.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9.1a1.7 1.7 0 0 0 1-1.55V2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.57 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.3 8.9V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H4" />
    </template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93 6.34 6.34" />
      <path d="M17.66 17.66 19.07 19.07" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07 6.34 17.66" />
      <path d="M17.66 6.34 19.07 4.93" />
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M21 12a9 9 0 0 1-15.5 6.36" />
      <path d="M3 12A9 9 0 0 1 18.5 5.64" />
      <path d="M3 16v-4h4" />
      <path d="M21 8v4h-4" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </template>
    <template v-else-if="name === 'play'">
      <path d="m8 5 11 7-11 7V5Z" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12 4 4L19 6" />
    </template>
    <template v-else-if="name === 'alert'">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.55 21h16.9a2 2 0 0 0 1.73-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </template>
    <template v-else-if="name === 'sparkles'">
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
      <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
      <path d="m5 14 .9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Z" />
    </template>
    <template v-else-if="name === 'link'">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.6 5.33" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.8 13.12a5 5 0 1 0 7.07 7.07l1.4-1.4" />
    </template>
    <template v-else-if="name === 'users'">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </template>
    <template v-else-if="name === 'bolt'">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="m9 18 6-6-6-6" />
    </template>
    <template v-else-if="name === 'github'">
      <path d="M9 19c-4.5 1.5-4.5-2.5-6-3" />
      <path d="M15 22v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-6 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77 5.44 5.44 0 0 0 3.5 8.53c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </template>
    <template v-else-if="name === 'rocket'">
      <path d="M4.5 16.5c-1.5 1.5-2 4-2 4s2.5-.5 4-2 2-4 2-4-2.5.5-4 2Z" />
      <path d="M14 10 9 15" />
      <path d="M12 3c4.5 0 9 4.5 9 9-2.5 1-5.5 1-8 0L6 19c-1.5-2.5-1.5-5.5 0-8l6-8Z" />
      <circle cx="15" cy="9" r="1.5" />
    </template>
    <template v-else-if="name === 'key'">
      <circle cx="8" cy="15" r="4" />
      <path d="M12 15h9" />
      <path d="M18 12v6" />
      <path d="M15 12v3" />
    </template>
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  name:
    | 'alert'
    | 'apps'
    | 'bolt'
    | 'check'
    | 'chevron-right'
    | 'close'
    | 'copy'
    | 'eye'
    | 'github'
    | 'key'
    | 'link'
    | 'logout'
    | 'menu'
    | 'messages'
    | 'moon'
    | 'play'
    | 'plus'
    | 'refresh'
    | 'rocket'
    | 'search'
    | 'settings'
    | 'sparkles'
    | 'sun'
    | 'trash'
    | 'users';
  size?: number;
  class?: string;
}>(), {
  size: 18,
  class: '',
});

const customClass = computed(() => props.class);
const styleObject = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>
