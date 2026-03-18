import { computed } from 'vue';
import { useRoute, useRouter, useState } from '#imports';
import type { DeliveryType, ManagedAppSummary } from '~/types';
import { useAppApi } from '~/composables/api/useAppApi';

type AppSidebarTypeFilter = '' | DeliveryType;

interface RefreshAppListOptions {
  preferredId?: string;
}

export function useAppWorkspaceSidebar() {
  const route = useRoute();
  const router = useRouter();
  const appApi = useAppApi();

  const apps = useState<ManagedAppSummary[]>('app-workspace-sidebar:apps', () => []);
  const loading = useState<boolean>('app-workspace-sidebar:loading', () => false);
  const searchQuery = useState<string>('app-workspace-sidebar:search', () => '');
  const typeFilter = useState<AppSidebarTypeFilter>('app-workspace-sidebar:type', () => '');
  const refreshSignal = useState<number>('app-workspace-sidebar:refresh', () => 0);
  const createSignal = useState<number>('app-workspace-sidebar:create', () => 0);

  const selectedAppId = computed(() => typeof route.query.app === 'string' ? route.query.app : '');

  const filteredApps = computed(() => apps.value.filter((app) => {
    if (typeFilter.value && app.deliveryType !== typeFilter.value) return false;
    if (!searchQuery.value) return true;

    const keyword = searchQuery.value.toLowerCase();
    return app.name.toLowerCase().includes(keyword) || app.key.toLowerCase().includes(keyword);
  }));

  async function replaceQuery(appId?: string) {
    const nextQuery = Object.fromEntries(
      Object.entries({
        ...route.query,
        app: appId || undefined,
      }).filter(([, value]) => value !== undefined)
    );

    await router.replace({
      query: nextQuery,
    });
  }

  async function syncSelection(preferredId?: string) {
    const availableIds = new Set(apps.value.map((app) => app.id));

    if (preferredId && availableIds.has(preferredId)) {
      if (selectedAppId.value !== preferredId) {
        await replaceQuery(preferredId);
      }
      return preferredId;
    }

    if (selectedAppId.value && availableIds.has(selectedAppId.value)) {
      return selectedAppId.value;
    }

    const fallbackId = apps.value[0]?.id || '';

    if (fallbackId) {
      await replaceQuery(fallbackId);
      return fallbackId;
    }

    if (selectedAppId.value) {
      await replaceQuery();
    }

    return '';
  }

  async function refreshAppList(options: RefreshAppListOptions = {}) {
    loading.value = true;

    try {
      const response = await appApi.getApps();
      apps.value = response.data || [];
      return await syncSelection(options.preferredId);
    } finally {
      loading.value = false;
    }
  }

  function requestRefresh() {
    refreshSignal.value += 1;
  }

  function requestCreate() {
    createSignal.value += 1;
  }

  async function selectApp(id: string) {
    if (!id || selectedAppId.value === id) return;
    await replaceQuery(id);
  }

  async function clearSelection() {
    await replaceQuery();
  }

  function getNextSelectionAfterDelete(deletedId: string) {
    const currentIndex = apps.value.findIndex((app) => app.id === deletedId);

    if (currentIndex === -1) {
      return apps.value[0]?.id || '';
    }

    return apps.value[currentIndex + 1]?.id || apps.value[currentIndex - 1]?.id || '';
  }

  return {
    apps,
    clearSelection,
    createSignal,
    filteredApps,
    getNextSelectionAfterDelete,
    loading,
    refreshSignal,
    refreshAppList,
    requestCreate,
    requestRefresh,
    searchQuery,
    selectApp,
    selectedAppId,
    typeFilter,
  };
}
