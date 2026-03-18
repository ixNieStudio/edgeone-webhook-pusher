<template>
  <AppSideSheet
    :open="open"
    :title="mode === 'edit' ? '编辑应用' : '创建应用'"
    description="从应用视角完成连接、消息发送方式和接收者配置。"
    @close="emit('close')"
  >
    <div v-if="managedForm.preparing" class="metric-card flex items-center justify-center gap-3 px-4 py-8 text-sm text-subtle">
      <AppIcon name="refresh" :size="16" class="animate-spin" />
      <span>正在加载应用配置…</span>
    </div>

    <div v-else class="space-y-4">
      <div>
        <label class="field-label" for="app-name">应用名称</label>
        <input id="app-name" v-model.trim="managedForm.form.name" type="text" class="input-base" placeholder="例如：生产告警通知" />
      </div>

      <div>
        <label class="field-label" for="delivery-type">发送类型</label>
        <select id="delivery-type" v-model="managedForm.form.deliveryType" class="select-base" :disabled="mode === 'edit'">
          <option value="dingtalk">钉钉 Webhook</option>
          <option value="feishu">飞书 Webhook</option>
          <option value="wechat">微信公众号</option>
          <option value="work_wechat">企业微信</option>
        </select>
        <div class="surface-inset mt-2 inline-flex items-center gap-2 px-2.5 py-2 text-sm text-app-muted">
          <ChannelIcon :type="managedForm.form.deliveryType" :size="18" />
          <span>{{ deliveryLabel(managedForm.form.deliveryType) }}</span>
        </div>
      </div>

      <div class="surface-inset px-3.5 py-3.5">
        <div class="text-app text-sm font-semibold">连接配置</div>

        <template v-if="managedForm.isWebhookType(managedForm.form.deliveryType)">
          <div class="mt-3 space-y-3.5">
            <div>
              <label class="field-label" for="webhook-url">Webhook URL</label>
              <input id="webhook-url" v-model.trim="managedForm.form.webhookUrl" type="url" class="input-base mono" placeholder="https://..." />
            </div>
            <div>
              <label class="field-label" for="webhook-secret">签名密钥（可选）</label>
              <input id="webhook-secret" v-model.trim="managedForm.form.webhookSecret" type="text" class="input-base mono" />
            </div>
          </div>
        </template>

        <template v-else>
          <div class="mt-3 space-y-3.5">
            <div>
              <label class="field-label" for="auth-mode">认证配置来源</label>
              <select id="auth-mode" v-model="managedForm.form.authMode" class="select-base">
                <option value="existing">复用已有认证配置</option>
                <option value="draft">在当前流程中新建</option>
              </select>
            </div>

            <template v-if="managedForm.form.authMode === 'existing'">
              <div>
                <label class="field-label" for="auth-profile">选择认证配置</label>
                <select id="auth-profile" v-model="managedForm.form.authProfileId" class="select-base">
                  <option value="">请选择</option>
                  <option
                    v-for="profile in authProfiles.filter((item) => item.type === managedForm.form.deliveryType)"
                    :key="profile.id"
                    :value="profile.id"
                  >
                    {{ profile.name }}
                  </option>
                </select>
              </div>
            </template>

            <template v-else>
              <div>
                <label class="field-label" for="draft-name">认证配置名称</label>
                <input id="draft-name" v-model.trim="managedForm.form.draft.name" type="text" class="input-base" placeholder="例如：生产环境凭证" />
              </div>

              <template v-if="managedForm.form.deliveryType === 'wechat'">
                <div>
                  <label class="field-label" for="draft-appid">App ID</label>
                  <input id="draft-appid" v-model.trim="managedForm.form.draft.wechat.appId" type="text" class="input-base" />
                </div>
                <div>
                  <label class="field-label" for="draft-secret">App Secret</label>
                  <input id="draft-secret" v-model.trim="managedForm.form.draft.wechat.appSecret" type="text" class="input-base mono" />
                </div>
              </template>

              <template v-else>
                <div>
                  <label class="field-label" for="draft-corp-id">Corp ID</label>
                  <input id="draft-corp-id" v-model.trim="managedForm.form.draft.workWechat.corpId" type="text" class="input-base" />
                </div>
                <div>
                  <label class="field-label" for="draft-agent-id">Agent ID</label>
                  <input id="draft-agent-id" v-model.number="managedForm.form.draft.workWechat.agentId" type="number" min="1" class="input-base" />
                </div>
                <div>
                  <label class="field-label" for="draft-corp-secret">Corp Secret</label>
                  <input id="draft-corp-secret" v-model.trim="managedForm.form.draft.workWechat.corpSecret" type="text" class="input-base mono" />
                </div>
              </template>
            </template>
          </div>
        </template>
      </div>

      <div class="surface-inset px-3.5 py-3.5">
        <div class="text-app text-sm font-semibold">消息发送</div>
        <div class="mt-3 space-y-3.5">
          <template v-if="managedForm.form.deliveryType === 'wechat' || managedForm.form.deliveryType === 'work_wechat'">
            <div>
              <label class="field-label" for="default-send-type">默认发送类型</label>
              <select id="default-send-type" v-model="managedForm.form.defaultSendType" class="select-base">
                <option
                  v-for="sendType in managedForm.sendTypesForType(managedForm.form.deliveryType)"
                  :key="sendType"
                  :value="sendType"
                >
                  {{ sendType === 'page' ? '网页' : '文本' }}
                </option>
              </select>
            </div>

            <div class="surface-accent rounded-[0.95rem] px-3.5 py-3.5 text-sm leading-[1.55]">
              <template v-if="managedForm.form.defaultSendType === 'page'">
                网页类型会自动生成项目详情页，发送时只需传 <code class="mono">title</code> 和 <code class="mono">desp</code>；如果额外传了 <code class="mono">url</code>，系统会自动忽略。
              </template>
              <template v-else>
                文本类型支持 <code class="mono">title</code>、<code class="mono">desp</code> 和可选 <code class="mono">url</code>，消息会直接按普通文本发出。
              </template>
            </div>
          </template>

          <template v-else>
            <div>
              <label class="field-label" for="renderer">Renderer</label>
              <select id="renderer" v-model="managedForm.form.renderer" class="select-base">
                <option
                  v-for="renderer in managedForm.renderersForType(managedForm.form.deliveryType)"
                  :key="renderer"
                  :value="renderer"
                >
                  {{ rendererLabel(renderer) }}
                </option>
              </select>
            </div>
          </template>
        </div>
      </div>

      <div class="surface-inset px-3.5 py-3.5">
        <div class="text-app text-sm font-semibold">接收者策略</div>
        <div class="mt-3 space-y-3.5">
          <template v-if="managedForm.form.deliveryType === 'work_wechat'">
            <div>
              <label class="field-label" for="user-ids">User IDs（逗号分隔）</label>
              <textarea id="user-ids" v-model="managedForm.form.userIdsText" class="textarea-base" />
            </div>
            <div>
              <label class="field-label" for="department-ids">Department IDs（逗号分隔）</label>
              <textarea id="department-ids" v-model="managedForm.form.departmentIdsText" class="textarea-base" />
            </div>
          </template>
          <template v-else-if="managedForm.form.deliveryType === 'wechat'">
            <div class="surface-accent rounded-[0.95rem] px-3.5 py-3.5 text-sm leading-[1.55]">
              公众号应用默认使用订阅接收者模式。接收者绑定在应用详情页通过绑定码完成。
            </div>
          </template>
          <template v-else>
            <div class="surface-accent rounded-[0.95rem] px-3.5 py-3.5 text-sm leading-[1.55]">
              Webhook 类型应用不需要绑定接收者，消息会直接发往配置好的 webhook。
            </div>
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button class="button-secondary" type="button" @click="emit('close')">取消</button>
        <button class="button-primary" type="button" :disabled="managedForm.saving || managedForm.preparing" @click="handleSubmit">
          <AppIcon name="check" :size="16" />
          <span>{{ managedForm.saving ? '保存中…' : (mode === 'edit' ? '保存修改' : '创建应用') }}</span>
        </button>
      </div>
    </template>
  </AppSideSheet>
</template>

<script setup lang="ts">
import { proxyRefs, toRef, watch } from 'vue';
import type { AuthProfileSummary, ManagedAppLiteDetail } from '~/types';
import type { AppsCapabilityMap, SheetMode } from '../types';
import { useManagedAppForm } from '../composables/useManagedAppForm';
import { deliveryLabel, rendererLabel } from '../utils';
import AppIcon from '~/shared/icons/AppIcon.vue';
import ChannelIcon from '~/shared/icons/ChannelIcon.vue';
import AppSideSheet from '~/shared/ui/AppSideSheet.vue';

const props = defineProps<{
  open: boolean;
  mode: SheetMode;
  selectedAppId: string;
  selectedApp: ManagedAppLiteDetail | null;
  authProfiles: AuthProfileSummary[];
  capabilities: AppsCapabilityMap | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', appId: string): void;
}>();

const managedForm = proxyRefs(useManagedAppForm({
  authProfiles: toRef(props, 'authProfiles'),
  capabilities: toRef(props, 'capabilities'),
}));

watch(() => [props.open, props.mode, props.selectedApp?.id], async ([open, mode]) => {
  if (!open) return;
  if (mode === 'create') {
    await managedForm.prepareCreate();
    return;
  }
  if (mode === 'edit' && props.selectedApp) {
    await managedForm.prepareEdit(props.selectedApp);
  }
}, { immediate: true });

async function handleSubmit() {
  const appId = await managedForm.submit(props.mode, props.selectedAppId);
  if (appId) {
    emit('saved', appId);
  }
}
</script>
