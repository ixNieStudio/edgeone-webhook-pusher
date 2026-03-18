import { ref } from 'vue';
import type { AuthProfileDetail, ManagedAppLiteDetail } from '~/types';
import { useAuthProfileApi } from '~/composables/api/useAuthProfileApi';

export function useAuthProfilePreview() {
  const authProfileApi = useAuthProfileApi();
  const selectedAuthProfileDetail = ref<AuthProfileDetail | null>(null);
  const authProfilePreviewLoading = ref(false);
  const requestId = ref(0);

  async function loadAuthProfilePreview(app: ManagedAppLiteDetail | null) {
    const currentRequestId = ++requestId.value;

    if (!app || app.connectionMode !== 'auth_profile_ref' || !app.authProfileId) {
      selectedAuthProfileDetail.value = null;
      authProfilePreviewLoading.value = false;
      return null;
    }

    authProfilePreviewLoading.value = true;
    try {
      const response = await authProfileApi.getAuthProfileDetail(app.authProfileId);
      if (currentRequestId !== requestId.value) return null;
      selectedAuthProfileDetail.value = response.data || null;
      return selectedAuthProfileDetail.value;
    } catch {
      if (currentRequestId !== requestId.value) return null;
      selectedAuthProfileDetail.value = null;
      return null;
    } finally {
      if (currentRequestId === requestId.value) {
        authProfilePreviewLoading.value = false;
      }
    }
  }

  function resetAuthProfilePreview() {
    requestId.value += 1;
    selectedAuthProfileDetail.value = null;
    authProfilePreviewLoading.value = false;
  }

  return {
    authProfilePreviewLoading,
    loadAuthProfilePreview,
    resetAuthProfilePreview,
    selectedAuthProfileDetail,
  };
}
