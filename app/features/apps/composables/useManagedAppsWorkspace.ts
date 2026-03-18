import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from '#imports';
import type { AuthProfileSummary, ManagedAppLiteDetail, SetupOverview } from '~/types';
import { useAppApi } from '~/composables/api/useAppApi';
import { useAuthProfileApi } from '~/composables/api/useAuthProfileApi';
import { useAppWorkspaceSidebar } from '~/composables/useAppWorkspaceSidebar';
import { showToast } from '~/composables/useToast';
import type { AppsCapabilityMap, SheetMode } from '../types';
import { formatCompactDateTime } from '../utils';
import { useManagedAppDetail } from './useManagedAppDetail';
import { useWeChatBindState } from './useWeChatBindState';

export function useManagedAppsWorkspace() {
  const route = useRoute();
  const router = useRouter();
  const appApi = useAppApi();
  const authProfileApi = useAuthProfileApi();
  const sidebar = useAppWorkspaceSidebar();
  const detail = useManagedAppDetail();

  const overview = ref<SetupOverview | null>(null);
  const authProfiles = ref<AuthProfileSummary[]>([]);
  const capabilities = ref<AppsCapabilityMap | null>(null);
  const loading = ref(false);
  const confirmDelete = ref(false);

  const bind = useWeChatBindState({
    getSelectedAppId: () => sidebar.selectedAppId.value,
    onBound: async () => {
      await detail.refreshRecipients(sidebar.selectedAppId.value);
    },
  });

  const sheetMode = computed<SheetMode>(() => {
    const value = route.query.sheet;
    return value === 'create' || value === 'edit' ? value : '';
  });

  const authProfileDetailId = computed(() => typeof route.query.authProfile === 'string' ? route.query.authProfile : '');

  const selectedApp = computed<ManagedAppLiteDetail | null>(() => {
    if (detail.appDetail.value?.id === sidebar.selectedAppId.value) return detail.appDetail.value;
    return null;
  });

  const isRefreshing = computed(() => loading.value || sidebar.loading.value);

  const overviewStats = computed(() => ({
    apps: overview.value?.stats.apps ?? sidebar.apps.value.length,
    authProfiles: overview.value?.stats.authProfiles ?? authProfiles.value.length,
    recipients: overview.value?.stats.recipients ?? sidebar.apps.value.reduce((sum, item) => sum + item.recipientCount, 0),
    messages: overview.value?.stats.messages ?? 0,
  }));

  const overviewStatusItems = computed(() => [
    { label: `应用 ${overviewStats.value.apps}`, tone: 'neutral' as const },
    { label: `认证配置 ${overviewStats.value.authProfiles}`, tone: 'cyan' as const },
    { label: `接收者 ${overviewStats.value.recipients}`, tone: 'amber' as const },
    { label: `消息记录 ${overviewStats.value.messages}`, tone: 'emerald' as const },
  ]);

  const authProfileMaintenanceSummary = computed(() => {
    if (!selectedApp.value || selectedApp.value.connectionMode !== 'auth_profile_ref') {
      return '';
    }

    if (!selectedApp.value.maintenanceSnapshot) {
      return '维护状态未读取';
    }

    const maintenance = selectedApp.value.maintenanceSnapshot;
    return `刷新 ${formatCompactDateTime(maintenance.lastRefreshAt)} · 过期 ${formatCompactDateTime(maintenance.expiresAt)}`;
  });

  async function setRouteQuery(query: Record<string, string | undefined>) {
    const nextQuery = Object.fromEntries(
      Object.entries({
        ...route.query,
        ...query,
      }).filter(([, value]) => value !== undefined)
    );

    await router.replace({
      query: nextQuery,
    });
  }

  async function openCreateSheet() {
    await setRouteQuery({ sheet: 'create' });
  }

  async function openEditSheet() {
    if (!selectedApp.value) return;
    await setRouteQuery({ sheet: 'edit' });
  }

  async function closeSheet() {
    await setRouteQuery({ sheet: undefined });
  }

  function scrollToUsageTest() {
    document.getElementById('app-usage-test')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  async function openAuthProfileDetail(profileId: string) {
    await setRouteQuery({
      authProfile: profileId,
      sheet: undefined,
    });
  }

  async function closeAuthProfileDetail() {
    await setRouteQuery({ authProfile: undefined });
  }

  async function navigateToUsageApp(appId: string) {
    await setRouteQuery({
      app: appId,
      authProfile: authProfileDetailId.value || undefined,
      sheet: undefined,
    });
  }

  async function loadSelectedApp() {
    await detail.loadSelectedApp(sidebar.selectedAppId.value);
  }

  async function refreshAll(preferredId?: string) {
    loading.value = true;
    const previousSelectedId = sidebar.selectedAppId.value;

    try {
      const [resolvedSelectedId, overviewRes, authProfilesRes, capabilitiesRes] = await Promise.all([
        sidebar.refreshAppList({ preferredId }),
        appApi.getSetupOverview(),
        authProfileApi.getAuthProfiles(),
        appApi.getChannelCapabilities(),
      ]);

      overview.value = overviewRes.data || null;
      authProfiles.value = authProfilesRes.data || [];
      capabilities.value = capabilitiesRes.data as AppsCapabilityMap;

      if (!resolvedSelectedId) {
        bind.resetBindState();
        detail.clearSelectedApp();
      } else if (resolvedSelectedId === previousSelectedId) {
        await loadSelectedApp();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载应用失败', 'error');
    } finally {
      loading.value = false;
    }
  }

  async function deleteSelectedApp() {
    if (!sidebar.selectedAppId.value) return;

    confirmDelete.value = false;
    try {
      const nextSelectedId = sidebar.getNextSelectionAfterDelete(sidebar.selectedAppId.value);
      await appApi.deleteApp(sidebar.selectedAppId.value);
      showToast('应用已删除', 'success');
      detail.clearSelectedApp();
      bind.resetBindState();
      await refreshAll(nextSelectedId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除应用失败', 'error');
    }
  }

  async function removeRecipient(recipientId: string) {
    if (!sidebar.selectedAppId.value) return;

    try {
      await appApi.deleteRecipient(sidebar.selectedAppId.value, recipientId);
      showToast('接收者已移除', 'success');
      await detail.refreshRecipients(sidebar.selectedAppId.value);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '移除接收者失败', 'error');
    }
  }

  watch(sidebar.selectedAppId, (value, previousValue) => {
    if (value === previousValue) return;

    bind.resetBindState();

    if (value) {
      void loadSelectedApp();
    } else {
      detail.clearSelectedApp();
    }
  });

  watch(sidebar.refreshSignal, (value, previousValue) => {
    if (value === previousValue) return;
    void refreshAll(sidebar.selectedAppId.value || undefined);
  });

  watch(sidebar.createSignal, (value, previousValue) => {
    if (value === previousValue) return;
    void openCreateSheet();
  });

  onMounted(() => {
    void refreshAll();
  });

  return {
    authProfileDetailId,
    authProfileMaintenanceSummary,
    authProfiles,
    capabilities,
    closeAuthProfileDetail,
    closeSheet,
    confirmDelete,
    deleteSelectedApp,
    detailLoading: detail.detailLoading,
    generateBindCode: bind.generateBindCode,
    isRefreshing,
    loading,
    navigateToUsageApp,
    openAuthProfileDetail,
    openCreateSheet,
    openEditSheet,
    overviewStatusItems,
    overview,
    refreshAll,
    removeRecipient,
    recipients: detail.recipients,
    recipientsLoading: detail.recipientsLoading,
    scrollToUsageTest,
    selectedApp,
    selectedAppId: sidebar.selectedAppId,
    setConfirmDelete: (value: boolean) => { confirmDelete.value = value; },
    sheetMode,
    sidebar,
    bindState: bind.bindState,
    bindStateView: bind.bindStateView,
  };
}
