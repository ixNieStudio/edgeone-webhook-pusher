<template>
  <div class="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
    <nav class="px-4 md:px-6 lg:px-8" aria-label="Section navigation">
      <div class="flex items-center gap-1 overflow-x-auto">
        <button
          v-for="section in sections"
          :key="section.id"
          class="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="activeSection === section.id 
            ? 'border-primary-600 text-primary-600 dark:text-primary-400' 
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'"
          @click="scrollToSection(section.id)"
          :aria-current="activeSection === section.id ? 'page' : undefined"
        >
          <Icon :icon="section.icon" class="text-lg" />
          <span>{{ section.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref, onMounted, onUnmounted } from 'vue';

interface NavigationSection {
  id: string;
  label: string;
  icon: string;
}

interface Props {
  sections: NavigationSection[];
}

const props = defineProps<Props>();
const activeSection = ref<string>(props.sections[0]?.id || '');

let observer: IntersectionObserver | null = null;

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activeSection.value = sectionId;
  }
}

onMounted(() => {
  // Set up Intersection Observer to track active section
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          activeSection.value = entry.target.id;
        }
      });
    },
    {
      threshold: [0.5],
      rootMargin: '-100px 0px -50% 0px',
    }
  );

  // Observe all sections
  props.sections.forEach((section) => {
    const element = document.getElementById(section.id);
    if (element && observer) {
      observer.observe(element);
    }
  });
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>
