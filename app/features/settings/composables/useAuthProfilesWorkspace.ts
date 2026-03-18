import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from '#imports';
import type { AuthProfileDetail, AuthProfileSummary } from '~/types';
import { useAuthProfileApi } from '~/composables/api/useAuthProfileApi';
import { showToast } from '~/composables/useToast';

export function useAuthProfilesWorkspace() {
  const authProfileApi = useAuthProfileApi();
  const route = useRoute();
  const router = useRouter();

  const loading = ref(false);
  const saving = ref(false);
  const profiles = ref<AuthProfileSummary[]>([]);
  const sheetOpen = ref(false);
  const editingId = ref('');
  const reopenDetailId = ref('');

  const form = reactive({
    name: '',
    type: 'wechat' as 'wechat' | 'work_wechat',
    wechat: {
      appId: '',
      appSecret: '',
    },
    workWechat: {
      corpId: '',
      agentId: 0,
      corpSecret: '',
    },
  });

  const detailProfileId = computed(() => typeof route.query.authProfile === 'string' ? route.query.authProfile : '');
  const detailSheetOpen = computed(() => Boolean(detailProfileId.value));

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

  function resetForm() {
    form.name = '';
    form.type = 'wechat';
    form.wechat.appId = '';
    form.wechat.appSecret = '';
    form.workWechat.corpId = '';
    form.workWechat.agentId = 0;
    form.workWechat.corpSecret = '';
  }

  function openCreate() {
    reopenDetailId.value = '';
    void setRouteQuery({ authProfile: undefined });
    editingId.value = '';
    resetForm();
    sheetOpen.value = true;
  }

  function openEdit(profile: AuthProfileSummary) {
    reopenDetailId.value = '';
    void setRouteQuery({ authProfile: undefined });
    editingId.value = profile.id;
    form.name = profile.name;
    form.type = profile.type;
    if (profile.type === 'wechat') {
      form.wechat.appId = String(profile.config.appId || '');
      form.wechat.appSecret = '';
    } else {
      form.workWechat.corpId = String(profile.config.corpId || '');
      form.workWechat.agentId = Number(profile.config.agentId || 0);
      form.workWechat.corpSecret = '';
    }
    sheetOpen.value = true;
  }

  function openEditFromDetail(profile: AuthProfileDetail) {
    reopenDetailId.value = profile.id;
    editingId.value = profile.id;
    form.name = profile.name;
    form.type = profile.type;
    if (profile.type === 'wechat') {
      form.wechat.appId = String(profile.config.appId || '');
      form.wechat.appSecret = '';
    } else {
      form.workWechat.corpId = String(profile.config.corpId || '');
      form.workWechat.agentId = Number(profile.config.agentId || 0);
      form.workWechat.corpSecret = '';
    }
    sheetOpen.value = true;
    void setRouteQuery({ authProfile: undefined });
  }

  function openDetail(profileId: string) {
    sheetOpen.value = false;
    editingId.value = '';
    resetForm();
    reopenDetailId.value = '';
    void setRouteQuery({ authProfile: profileId });
  }

  function closeSheet() {
    sheetOpen.value = false;
    editingId.value = '';
    reopenDetailId.value = '';
    resetForm();
  }

  function closeDetail() {
    void setRouteQuery({ authProfile: undefined });
  }

  function navigateToApp(appId: string) {
    void router.push({
      path: '/admin/apps',
      query: {
        app: appId,
        authProfile: detailProfileId.value || undefined,
      },
    });
  }

  async function loadProfiles() {
    loading.value = true;
    try {
      const response = await authProfileApi.getAuthProfiles();
      profiles.value = response.data || [];
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载认证配置失败', 'error');
    } finally {
      loading.value = false;
    }
  }

  async function submitForm() {
    saving.value = true;

    try {
      if (!form.name) {
        throw new Error('请输入配置名称');
      }

      const nextDetailId = editingId.value && reopenDetailId.value === editingId.value
        ? editingId.value
        : '';

      if (editingId.value) {
        const payload = form.type === 'wechat'
          ? {
              name: form.name,
              config: {
                ...(form.wechat.appId ? { appId: form.wechat.appId } : {}),
                ...(form.wechat.appSecret ? { appSecret: form.wechat.appSecret } : {}),
              },
            }
          : {
              name: form.name,
              config: {
                ...(form.workWechat.corpId ? { corpId: form.workWechat.corpId } : {}),
                ...(form.workWechat.agentId ? { agentId: form.workWechat.agentId } : {}),
                ...(form.workWechat.corpSecret ? { corpSecret: form.workWechat.corpSecret } : {}),
              },
            };

        await authProfileApi.updateAuthProfile(editingId.value, payload);
        showToast('认证配置已更新', 'success');
      } else {
        const payload = form.type === 'wechat'
          ? {
              name: form.name,
              type: 'wechat' as const,
              config: {
                appId: form.wechat.appId,
                appSecret: form.wechat.appSecret,
              },
            }
          : {
              name: form.name,
              type: 'work_wechat' as const,
              config: {
                corpId: form.workWechat.corpId,
                agentId: form.workWechat.agentId,
                corpSecret: form.workWechat.corpSecret,
              },
            };

        await authProfileApi.createAuthProfile(payload);
        showToast('认证配置已创建', 'success');
      }

      closeSheet();
      await loadProfiles();
      if (nextDetailId) {
        await setRouteQuery({ authProfile: nextDetailId });
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存认证配置失败', 'error');
    } finally {
      saving.value = false;
    }
  }

  return {
    closeDetail,
    closeSheet,
    detailProfileId,
    detailSheetOpen,
    editingId,
    form,
    loadProfiles,
    loading,
    navigateToApp,
    openCreate,
    openDetail,
    openEdit,
    openEditFromDetail,
    profiles,
    saving,
    sheetOpen,
    submitForm,
  };
}
