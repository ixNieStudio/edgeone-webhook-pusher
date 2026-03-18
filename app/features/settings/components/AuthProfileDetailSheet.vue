<template>
  <AppSideSheet
    :open="open"
    :title="detail?.name || '认证配置维护详情'"
    :description="detailDescription"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div v-if="loading && !detail" class="metric-card flex items-center justify-center gap-3 px-4 py-8 text-sm text-subtle">
        <AppIcon name="refresh" :size="16" class="animate-spin" />
        <span>正在加载认证配置详情…</span>
      </div>

      <div v-else-if="detail" class="space-y-4">
        <section class="surface-inset p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <ChannelIcon :type="detail.type" :size="24" class="rounded-[0.85rem]" />
                <div class="text-app text-lg font-semibold">{{ detail.name }}</div>
                <span :class="detail.type === 'wechat' ? 'badge-cyan' : 'badge-neutral'" class="badge-base">
                  {{ detail.type === 'wechat' ? '微信公众号' : '企业微信' }}
                </span>
                <span :class="maintenanceBadgeClass(detail.maintenance)" class="badge-base">
                  {{ maintenanceLabel(detail.maintenance) }}
                </span>
              </div>
              <p class="mt-2 text-sm leading-[1.55] text-subtle">
                {{ detail.type === 'wechat'
                  ? '维护公众号凭证、回调入口、Token 状态与绑定相关配置。'
                  : '维护企业微信应用凭证、Token 状态与固定接收目标的发送前置配置。' }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <button class="button-secondary" type="button" :disabled="loading" @click="loadDetail">
                <AppIcon name="refresh" :size="16" :class="loading ? 'animate-spin' : ''" />
                <span>刷新</span>
              </button>
              <button class="button-primary" type="button" :disabled="verifying" @click="verifyProfile">
                <AppIcon name="bolt" :size="16" />
                <span>{{ verifying ? '验证中…' : '验证配置' }}</span>
              </button>
              <button v-if="editable" class="button-secondary" type="button" @click="emitEdit">
                <AppIcon name="settings" :size="16" />
                <span>编辑</span>
              </button>
            </div>
          </div>
        </section>

        <section class="surface-inset p-4">
          <div class="text-app text-sm font-semibold">基本信息</div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">认证配置 ID</div>
              <div class="text-app mt-1.5 break-all text-sm font-medium mono">{{ detail.id }}</div>
            </div>
            <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">类型</div>
              <div class="text-app mt-1.5 text-sm font-medium">{{ detail.type === 'wechat' ? '微信公众号' : '企业微信' }}</div>
            </div>
            <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">创建时间</div>
              <div class="text-app mt-1.5 text-sm font-medium">{{ formatDateTime(detail.createdAt) }}</div>
            </div>
            <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">更新时间</div>
              <div class="text-app mt-1.5 text-sm font-medium">{{ formatDateTime(detail.updatedAt) }}</div>
            </div>
          </div>
        </section>

        <section class="surface-inset p-4">
          <div class="text-app text-sm font-semibold">配置摘要</div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in detail.configDisplay"
              :key="item.key"
              class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3"
            >
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">{{ item.label }}</div>
              <div class="text-app mt-1.5 break-all text-sm font-medium mono">{{ item.value }}</div>
            </div>
          </div>
        </section>

        <section class="surface-inset p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-app text-sm font-semibold">维护状态</div>
              <p class="mt-1 text-sm leading-[1.55] text-subtle">
                当前状态会随手动验证或消息发送链路自动更新。
              </p>
            </div>
            <span :class="maintenanceBadgeClass(detail.maintenance)" class="badge-base">
              {{ maintenanceLabel(detail.maintenance) }}
            </span>
          </div>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">最后刷新</div>
              <div class="text-app mt-1.5 text-sm font-medium">{{ formatDateTime(detail.maintenance.lastRefreshAt) }}</div>
            </div>
            <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">过期时间</div>
              <div class="text-app mt-1.5 text-sm font-medium">{{ formatDateTime(detail.maintenance.expiresAt) }}</div>
            </div>
          </div>

          <div
            v-if="detail.maintenance.error"
            :class="detail.maintenance.status === 'warning' ? 'alert-warning' : 'alert-danger'"
            class="mt-3 px-3.5 py-3 text-sm leading-[1.55]"
          >
            {{ detail.maintenance.error }}
          </div>

          <div
            v-else-if="detail.maintenance.status === 'healthy'"
            class="alert-success mt-3 px-3.5 py-3 text-sm leading-[1.55]"
          >
            当前凭证状态正常，可继续用于消息发送与接收流程。
          </div>
        </section>

        <section class="surface-inset p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-app text-sm font-semibold">引用关系</div>
              <p class="mt-1 text-sm leading-[1.55] text-subtle">
                当前共有 {{ detail.usage.length }} 个应用正在复用这份认证配置。
              </p>
            </div>
            <span class="badge-base badge-neutral">{{ detail.usage.length }} 个应用</span>
          </div>

          <div v-if="detail.usage.length" class="mt-3 space-y-2.5">
            <button
              v-for="item in detail.usage"
              :key="item.appId"
              class="flex w-full items-center justify-between gap-3 rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--color-panel-strong)]"
              type="button"
              @click="emit('navigate-app', item.appId)"
            >
              <div class="min-w-0">
                <div class="text-app text-sm font-semibold">{{ item.appName }}</div>
                <div class="mt-1 text-sm text-subtle mono">{{ item.appKey }}</div>
              </div>
              <span :class="item.deliveryType === 'wechat' ? 'badge-cyan' : 'badge-neutral'" class="badge-base">
                {{ item.deliveryType === 'wechat' ? '微信公众号' : '企业微信' }}
              </span>
            </button>
          </div>
          <div
            v-else
            class="mt-3 rounded-[0.95rem] border border-dashed border-[var(--app-border-strong)] px-3.5 py-5 text-sm text-subtle"
          >
            这份认证配置目前还没有被应用引用。
          </div>
        </section>

        <section class="surface-inset p-4">
          <div class="text-app text-sm font-semibold">接入指引</div>

          <template v-if="detail.type === 'wechat' && detail.wechatInbound">
            <div class="mt-3 space-y-4">
              <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3.5">
                <div class="text-app text-sm font-semibold">接口配置</div>
                <div class="mt-3 space-y-3">
                  <div>
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">URL</div>
                    <div class="code-surface mt-1.5 px-3 py-2.5 text-sm mono">{{ detail.wechatInbound.callbackUrl }}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Token</div>
                    <div class="code-surface mt-1.5 flex items-center justify-between gap-3 px-3 py-2.5 text-sm mono">
                      <span class="break-all">{{ detail.wechatInbound.msgToken }}</span>
                      <button class="button-secondary shrink-0 px-3 py-2 text-xs" type="button" @click="copyText(detail.wechatInbound.msgToken, 'Token')">
                        <AppIcon name="copy" :size="14" />
                        <span>复制</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="detail.wechatInbound.baseUrlSource === 'request'"
                class="alert-warning px-3.5 py-3.5 text-sm leading-[1.55]"
              >
                当前显示的服务器 URL 基于浏览器访问地址自动生成，仅供参考。在 EdgeOne Pages 部署时，请务必配置 `KV_BASE_URL` 环境变量，确保外部访问 Node Functions 时能正确回到 KV 代理域名。
              </div>

              <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3.5">
                <div class="text-app text-sm font-semibold">微信公众号测试号配置指引</div>
                <ol class="mt-3 space-y-3 text-sm leading-[1.6] text-subtle">
                  <li>1. 访问微信公众平台测试号页面，扫码登录后获取测试号。</li>
                  <li>2. 将当前配置中的 AppID 和 AppSecret 填入测试号管理页，保持与本系统一致。</li>
                  <li>3. 在「接口配置信息」中填写上方 URL 与 Token，提交后微信消息会回调到本系统。</li>
                  <li>4. 关注测试号后，在应用详情页生成绑定码，再发送 `绑定 XXXX1234` 完成接收者绑定。</li>
                  <li>5. 如需突破客服消息 48 小时限制，可在测试号中新增模板消息，并在应用里配置模板 ID。</li>
                  <li>6. 切换正式公众号时，可在「设置与开发 / 基本配置 / 服务器配置」里使用相同的 URL 与 Token。</li>
                </ol>
              </div>

              <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3.5">
                <div class="text-app text-sm font-semibold">模板消息说明</div>
                <div class="mt-3 text-sm leading-[1.6] text-subtle">
                  <p>推荐模板字段映射：`first -> title`、`keyword1 -> desp`、`remark -> 备注`。</p>
                  <p class="mt-2">测试号模板仅用于测试，正式公众号模板需从模板库申请。正式公众号已停止新申请模板消息时，应优先考虑客服消息的 48 小时窗口限制。</p>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="mt-3 space-y-4">
              <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3.5">
                <div class="text-app text-sm font-semibold">企业微信接入流程</div>
                <ol class="mt-3 space-y-3 text-sm leading-[1.6] text-subtle">
                  <li>1. 在企业微信后台确认可用应用，并获取 CorpID、AgentID 和 Secret。</li>
                  <li>2. 将当前认证配置中的字段与企业微信后台保持一致，尤其注意 AgentID 与 Secret 的对应关系。</li>
                  <li>3. 点击上方“验证配置”，确认系统能够成功获取 Access Token，再继续创建或编辑应用。</li>
                  <li>4. 在应用中配置固定 `userIds` / `departmentIds`，企业微信不会走公众号式绑定流程。</li>
                  <li>5. 如果启用模板卡片，请确保目标成员与应用可见范围一致，避免发送成功但成员不可见。</li>
                </ol>
              </div>

              <div class="rounded-[0.95rem] border border-[var(--app-border)] px-3.5 py-3.5">
                <div class="text-app text-sm font-semibold">维护建议</div>
                <ul class="mt-3 space-y-2.5 text-sm leading-[1.6] text-subtle">
                  <li>建议在修改 Secret 后立即执行一次验证，确认 Token 已成功刷新。</li>
                  <li>若发送时出现 `invaliduser`、`invalidparty` 等错误，应优先检查应用可见范围与接收者 ID。</li>
                  <li>维护状态中的最后刷新时间和过期时间可用于判断当前凭证是否仍在有效期内。</li>
                </ul>
              </div>
            </div>
          </template>
        </section>
      </div>

      <div v-else class="metric-card px-4 py-8 text-center">
        <div class="text-app text-sm font-semibold">未找到认证配置详情</div>
        <p class="mt-2 text-sm leading-[1.55] text-subtle">
          请确认该认证配置仍然存在，或关闭抽屉后重新选择。
        </p>
      </div>
    </div>
  </AppSideSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AuthProfileDetail } from '~/types';
import { useAuthProfileApi } from '~/composables/api/useAuthProfileApi';
import { showToast } from '~/composables/useToast';
import AppIcon from '~/shared/icons/AppIcon.vue';
import ChannelIcon from '~/shared/icons/ChannelIcon.vue';
import AppSideSheet from '~/shared/ui/AppSideSheet.vue';

const props = withDefaults(defineProps<{
  open: boolean;
  authProfileId: string;
  editable?: boolean;
}>(), {
  editable: false,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', profile: AuthProfileDetail): void;
  (e: 'navigate-app', appId: string): void;
}>();

const authProfileApi = useAuthProfileApi();

const loading = ref(false);
const verifying = ref(false);
const detail = ref<AuthProfileDetail | null>(null);

const detailDescription = computed(() => detail.value
  ? `查看 ${detail.value.type === 'wechat' ? '微信公众号' : '企业微信'} 凭证维护状态、接入配置和引用关系。`
  : '查看认证配置维护状态、接入配置和引用关系。');

function maintenanceBadgeClass(maintenance: AuthProfileDetail['maintenance']) {
  return {
    healthy: 'badge-emerald',
    warning: 'badge-amber',
    error: 'badge-rose',
    unknown: 'badge-neutral',
  }[maintenance.status];
}

function maintenanceLabel(maintenance: AuthProfileDetail['maintenance']) {
  return {
    healthy: '正常',
    warning: '待关注',
    error: '异常',
    unknown: '未验证',
  }[maintenance.status];
}

function formatDateTime(value?: string | number) {
  if (!value) return '未记录';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  showToast(`${label}已复制`, 'success');
}

async function loadDetail() {
  if (!props.open || !props.authProfileId) return;

  loading.value = true;
  try {
    const response = await authProfileApi.getAuthProfileDetail(props.authProfileId);
    detail.value = response.data || null;
  } catch (error) {
    detail.value = null;
    showToast(error instanceof Error ? error.message : '加载认证配置详情失败', 'error');
  } finally {
    loading.value = false;
  }
}

async function verifyProfile() {
  if (!props.authProfileId) return;

  verifying.value = true;
  try {
    const response = await authProfileApi.verifyAuthProfile(props.authProfileId);
    showToast(response.data.valid ? '认证配置验证成功' : (response.data.error || '认证配置验证失败'), response.data.valid ? 'success' : 'error');
    await loadDetail();
  } catch (error) {
    showToast(error instanceof Error ? error.message : '验证认证配置失败', 'error');
  } finally {
    verifying.value = false;
  }
}

function emitEdit() {
  if (!detail.value) return;
  emit('edit', detail.value);
}

watch(
  () => [props.open, props.authProfileId] as const,
  ([open, authProfileId]) => {
    if (!open || !authProfileId) {
      if (!open) {
        detail.value = null;
      }
      return;
    }

    void loadDetail();
  },
  { immediate: true },
);
</script>
