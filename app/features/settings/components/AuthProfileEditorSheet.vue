<template>
  <AppSideSheet
    :open="open"
    :title="editingId ? '编辑认证配置' : '新建认证配置'"
    description="只保存认证层配置，应用创建页会引用这里的资料。"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <div>
        <label class="field-label" for="profile-name">配置名称</label>
        <input id="profile-name" v-model.trim="form.name" type="text" class="input-base" placeholder="例如：生产环境公众号" />
      </div>

      <div>
        <label class="field-label" for="profile-type">配置类型</label>
        <select id="profile-type" v-model="form.type" class="select-base" :disabled="Boolean(editingId)">
          <option value="wechat">微信公众号</option>
          <option value="work_wechat">企业微信</option>
        </select>
        <div class="surface-inset mt-2 inline-flex items-center gap-2 px-2.5 py-2 text-sm text-app-muted">
          <ChannelIcon :type="form.type" :size="18" />
          <span>{{ form.type === 'wechat' ? '微信公众号' : '企业微信' }}</span>
        </div>
      </div>

      <template v-if="form.type === 'wechat'">
        <div>
          <label class="field-label" for="wechat-appid">App ID</label>
          <input id="wechat-appid" v-model.trim="form.wechat.appId" type="text" class="input-base" />
        </div>
        <div>
          <label class="field-label" for="wechat-secret">App Secret</label>
          <input id="wechat-secret" v-model.trim="form.wechat.appSecret" type="text" class="input-base mono" />
        </div>
      </template>

      <template v-else>
        <div>
          <label class="field-label" for="corp-id">Corp ID</label>
          <input id="corp-id" v-model.trim="form.workWechat.corpId" type="text" class="input-base" />
        </div>
        <div>
          <label class="field-label" for="agent-id">Agent ID</label>
          <input id="agent-id" v-model.number="form.workWechat.agentId" type="number" min="1" class="input-base" />
        </div>
        <div>
          <label class="field-label" for="corp-secret">Corp Secret</label>
          <input id="corp-secret" v-model.trim="form.workWechat.corpSecret" type="text" class="input-base mono" />
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button class="button-secondary" type="button" @click="emit('close')">取消</button>
        <button class="button-primary" type="button" :disabled="saving" @click="emit('submit')">
          <AppIcon name="check" :size="16" />
          <span>{{ saving ? '保存中…' : (editingId ? '保存修改' : '创建配置') }}</span>
        </button>
      </div>
    </template>
  </AppSideSheet>
</template>

<script setup lang="ts">
import AppIcon from '~/shared/icons/AppIcon.vue';
import ChannelIcon from '~/shared/icons/ChannelIcon.vue';
import AppSideSheet from '~/shared/ui/AppSideSheet.vue';

defineProps<{
  open: boolean;
  editingId: string;
  saving: boolean;
  form: {
    name: string;
    type: 'wechat' | 'work_wechat';
    wechat: {
      appId: string;
      appSecret: string;
    };
    workWechat: {
      corpId: string;
      agentId: number;
      corpSecret: string;
    };
  };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit'): void;
}>();
</script>
