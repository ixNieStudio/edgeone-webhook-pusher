import { ref } from 'vue';
import type { AppRecipientView, ManagedAppLiteDetail } from '~/types';
import { useAppApi } from '~/composables/api/useAppApi';
import { showToast } from '~/composables/useToast';

export function useManagedAppDetail() {
  const appApi = useAppApi();
  const appDetail = ref<ManagedAppLiteDetail | null>(null);
  const detailLoading = ref(false);
  const recipients = ref<AppRecipientView[]>([]);
  const recipientsLoading = ref(false);
  const detailRequestId = ref(0);
  const recipientsRequestId = ref(0);

  async function loadSelectedApp(appId: string) {
    if (!appId) {
      detailRequestId.value += 1;
      recipientsRequestId.value += 1;
      appDetail.value = null;
      recipients.value = [];
      detailLoading.value = false;
      recipientsLoading.value = false;
      return null;
    }

    const currentRequestId = ++detailRequestId.value;
    recipientsRequestId.value += 1;
    recipients.value = [];
    recipientsLoading.value = false;
    detailLoading.value = true;

    try {
      const response = await appApi.getApp(appId);
      if (currentRequestId !== detailRequestId.value) return null;
      appDetail.value = response.data || null;
      void refreshRecipients(appId);
      return appDetail.value;
    } catch (error) {
      if (currentRequestId !== detailRequestId.value) return null;
      showToast(error instanceof Error ? error.message : '加载应用详情失败', 'error');
      appDetail.value = null;
      recipients.value = [];
      return null;
    } finally {
      if (currentRequestId === detailRequestId.value) {
        detailLoading.value = false;
      }
    }
  }

  async function refreshRecipients(appId = appDetail.value?.id || '') {
    if (!appId) {
      recipientsRequestId.value += 1;
      recipientsLoading.value = false;
      recipients.value = [];
      return [];
    }

    const currentRequestId = ++recipientsRequestId.value;
    recipientsLoading.value = true;

    try {
      const response = await appApi.getAppRecipients(appId);
      if (currentRequestId !== recipientsRequestId.value) {
        return [];
      }

      recipients.value = response.data || [];
      if (appDetail.value?.id === appId) {
        appDetail.value = {
          ...appDetail.value,
          recipientCount: recipients.value.length,
        };
      }
      return recipients.value;
    } catch (error) {
      if (currentRequestId !== recipientsRequestId.value) {
        return [];
      }

      showToast(error instanceof Error ? error.message : '加载接收者失败', 'error');
      recipients.value = [];
      return [];
    } finally {
      if (currentRequestId === recipientsRequestId.value) {
        recipientsLoading.value = false;
      }
    }
  }

  function clearSelectedApp() {
    detailRequestId.value += 1;
    recipientsRequestId.value += 1;
    detailLoading.value = false;
    recipientsLoading.value = false;
    appDetail.value = null;
    recipients.value = [];
  }

  return {
    appDetail,
    clearSelectedApp,
    detailLoading,
    loadSelectedApp,
    recipients,
    recipientsLoading,
    refreshRecipients,
  };
}
