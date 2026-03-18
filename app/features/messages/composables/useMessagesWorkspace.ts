import { computed, ref, watch } from 'vue';
import type {
  MessageDetailView,
  MessageFilterAppItem,
  MessageListItem,
  MessageListStats,
} from '~/types';
import { useMessageApi } from '~/composables/api/useMessageApi';
import { showToast } from '~/composables/useToast';

type DirectionView = 'all' | 'outbound' | 'inbound';
type DatePreset = 'all' | '24h' | '7d' | '30d';

function createEmptyStats(): MessageListStats {
  return {
    total: 0,
    recent24h: 0,
    success: 0,
    failed: 0,
  };
}

function buildDateRange(preset: DatePreset) {
  if (preset === 'all') {
    return {};
  }

  const now = new Date();
  const start = new Date(now);
  if (preset === '24h') {
    start.setHours(start.getHours() - 24);
  } else if (preset === '7d') {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }

  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

export function useMessagesWorkspace() {
  const messageApi = useMessageApi();

  const initialLoading = ref(true);
  const refreshing = ref(false);
  const detailLoading = ref(false);

  const items = ref<MessageListItem[]>([]);
  const apps = ref<MessageFilterAppItem[]>([]);
  const stats = ref<MessageListStats>(createEmptyStats());
  const pagination = ref({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });

  const directionFilter = ref<DirectionView>('all');
  const appFilter = ref('');
  const datePreset = ref<DatePreset>('all');
  const quickFilter = ref('');

  const selectedMessageId = ref('');
  const detailCache = ref<Record<string, MessageDetailView>>({});

  const statusItems = computed(() => {
    const failedTone = stats.value.failed > 0 ? 'rose' : 'neutral';

    return [
      { label: `${pagination.value.total} 条记录`, tone: 'neutral' as const },
      { label: `24h ${stats.value.recent24h}`, tone: 'cyan' as const },
      { label: `成功 ${stats.value.success}`, tone: 'emerald' as const },
      { label: `失败 ${stats.value.failed}`, tone: failedTone as const },
    ];
  });

  const visibleItems = computed(() => {
    const keyword = quickFilter.value.trim().toLowerCase();
    if (!keyword) {
      return items.value;
    }

    return items.value.filter((item) => [
      item.title,
      item.previewText,
      item.appName,
      item.openId,
    ].some((value) => value?.toLowerCase().includes(keyword)));
  });

  const selectedSummary = computed(() => visibleItems.value.find((item) => item.id === selectedMessageId.value) || null);
  const selectedMessage = computed(() => {
    if (!selectedMessageId.value) {
      return null;
    }
    return detailCache.value[selectedMessageId.value] || null;
  });

  async function loadMessages(options?: { preserveSelection?: boolean; silent?: boolean }) {
    const preserveSelection = options?.preserveSelection ?? true;
    const silent = options?.silent ?? false;

    if (!silent) {
      if (items.value.length === 0) {
        initialLoading.value = true;
      } else {
        refreshing.value = true;
      }
    }

    try {
      const response = await messageApi.getMessages({
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
        direction: directionFilter.value === 'all' ? undefined : directionFilter.value,
        ...(appFilter.value ? { appId: appFilter.value } : {}),
        ...buildDateRange(datePreset.value),
      });

      items.value = response.data.items || [];
      apps.value = response.data.filters.apps || [];
      stats.value = response.data.stats || createEmptyStats();
      pagination.value = response.data.pagination;

      const nextSelectedId = resolveSelectedId(preserveSelection ? selectedMessageId.value : '');
      selectedMessageId.value = nextSelectedId;

      if (nextSelectedId) {
        void loadDetail(nextSelectedId);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载消息记录失败', 'error');
    } finally {
      initialLoading.value = false;
      refreshing.value = false;
    }
  }

  function resolveSelectedId(previousId: string) {
    if (previousId && visibleItems.value.some((item) => item.id === previousId)) {
      return previousId;
    }
    return visibleItems.value[0]?.id || '';
  }

  async function loadDetail(id: string) {
    if (!id || detailCache.value[id]) {
      return;
    }

    detailLoading.value = true;
    try {
      const response = await messageApi.getMessage(id);
      detailCache.value = {
        ...detailCache.value,
        [id]: response.data,
      };
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载消息详情失败', 'error');
    } finally {
      detailLoading.value = false;
    }
  }

  function refresh() {
    void loadMessages({ preserveSelection: true });
  }

  function selectMessage(id: string) {
    selectedMessageId.value = id;
    void loadDetail(id);
  }

  function setDirectionFilter(value: DirectionView) {
    directionFilter.value = value;
    pagination.value.page = 1;
    void loadMessages({ preserveSelection: false });
  }

  function setAppFilter(value: string) {
    appFilter.value = value;
    pagination.value.page = 1;
    void loadMessages({ preserveSelection: false });
  }

  function setDatePreset(value: DatePreset) {
    datePreset.value = value;
    pagination.value.page = 1;
    void loadMessages({ preserveSelection: false });
  }

  function setQuickFilter(value: string) {
    quickFilter.value = value;
  }

  function goToPage(page: number) {
    pagination.value.page = page;
    void loadMessages({ preserveSelection: false });
  }

  watch(visibleItems, (nextItems) => {
    if (!nextItems.length) {
      selectedMessageId.value = '';
      return;
    }

    if (!nextItems.some((item) => item.id === selectedMessageId.value)) {
      selectedMessageId.value = nextItems[0].id;
      void loadDetail(nextItems[0].id);
    }
  });

  return {
    appFilter,
    apps,
    datePreset,
    detailLoading,
    directionFilter,
    goToPage,
    initialLoading,
    loadMessages,
    pagination,
    quickFilter,
    refreshing,
    refresh,
    selectMessage,
    selectedMessage,
    selectedMessageId,
    selectedSummary,
    setAppFilter,
    setDatePreset,
    setDirectionFilter,
    setQuickFilter,
    statusItems,
    visibleItems,
  };
}
