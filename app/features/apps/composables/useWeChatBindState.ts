import { computed, onBeforeUnmount, reactive } from 'vue';
import type { BindCodeStatus, BindCodeViewState } from '~/types';
import { useAppApi } from '~/composables/api/useAppApi';
import { showToast } from '~/composables/useToast';

interface UseWeChatBindStateOptions {
  getSelectedAppId: () => string;
  onBound: () => Promise<void>;
}

export function useWeChatBindState(options: UseWeChatBindStateOptions) {
  const appApi = useAppApi();

  const bindState = reactive({
    loading: false,
    code: '',
    status: 'pending' as BindCodeStatus,
    expiresAt: undefined as number | undefined,
    qrCodeUrl: undefined as string | undefined,
    openId: undefined as string | undefined,
    nickname: undefined as string | undefined,
    avatar: undefined as string | undefined,
    timer: 0 as ReturnType<typeof setInterval> | 0,
  });

  const bindStateView = computed<BindCodeViewState | null>(() => {
    if (!bindState.code) return null;
    return {
      code: bindState.code,
      status: bindState.status,
      expiresAt: bindState.expiresAt,
      qrCodeUrl: bindState.qrCodeUrl,
      openId: bindState.openId,
      nickname: bindState.nickname,
      avatar: bindState.avatar,
    };
  });

  async function generateBindCode() {
    const selectedAppId = options.getSelectedAppId();
    if (!selectedAppId) return;

    bindState.loading = true;
    try {
      const response = await appApi.generateBindCode(selectedAppId);
      stopBindPolling();
      bindState.code = response.data.bindCode;
      bindState.status = 'pending';
      bindState.expiresAt = response.data.expiresAt;
      bindState.qrCodeUrl = response.data.qrCodeUrl;
      bindState.openId = undefined;
      bindState.nickname = undefined;
      bindState.avatar = undefined;
      startBindPolling();
      showToast('绑定码已生成', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '生成绑定码失败', 'error');
    } finally {
      bindState.loading = false;
    }
  }

  function startBindPolling() {
    stopBindPolling();
    bindState.timer = setInterval(async () => {
      const selectedAppId = options.getSelectedAppId();
      if (!selectedAppId || !bindState.code) return;
      try {
        const response = await appApi.getBindCodeStatus(selectedAppId, bindState.code);
        if (response.data.status === 'bound') {
          stopBindPolling();
          bindState.status = 'bound';
          bindState.openId = response.data.openId;
          bindState.nickname = response.data.nickname;
          bindState.avatar = response.data.avatar;
          showToast('新接收者已绑定', 'success');
          await options.onBound();
        }
        if (response.data.status === 'expired') {
          stopBindPolling();
          bindState.status = 'expired';
        }
      } catch {
        stopBindPolling();
      }
    }, 3000);
  }

  function stopBindPolling() {
    if (bindState.timer) {
      clearInterval(bindState.timer);
      bindState.timer = 0;
    }
  }

  function resetBindState() {
    stopBindPolling();
    bindState.loading = false;
    bindState.code = '';
    bindState.status = 'pending';
    bindState.expiresAt = undefined;
    bindState.qrCodeUrl = undefined;
    bindState.openId = undefined;
    bindState.nickname = undefined;
    bindState.avatar = undefined;
  }

  onBeforeUnmount(() => {
    stopBindPolling();
  });

  return {
    bindState,
    bindStateView,
    generateBindCode,
    resetBindState,
  };
}
