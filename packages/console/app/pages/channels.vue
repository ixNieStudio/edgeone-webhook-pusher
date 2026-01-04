<template>
  <div class="channels-page">
    <t-card :bordered="false">
      <template #header>
        <div class="card-header">
          <span>渠道列表</span>
          <t-button theme="primary" @click="showAddDialog = true">
            <template #icon><t-icon name="add" /></template>
            添加渠道
          </t-button>
        </div>
      </template>

      <t-loading :loading="loading">
        <t-table
          :data="channels"
          :columns="columns"
          row-key="id"
          hover
        >
          <template #enabled="{ row }">
            <t-switch
              :value="row.enabled"
              @change="(val: boolean) => toggleChannel(row.id, val)"
            />
          </template>
          <template #actions="{ row }">
            <t-space>
              <t-button
                theme="default"
                variant="text"
                @click="editChannel(row)"
              >
                编辑
              </t-button>
              <t-popconfirm
                content="确定删除该渠道吗？"
                @confirm="deleteChannel(row.id)"
              >
                <t-button theme="danger" variant="text">删除</t-button>
              </t-popconfirm>
            </t-space>
          </template>
        </t-table>
      </t-loading>
    </t-card>

    <!-- Add/Edit Dialog -->
    <t-dialog
      v-model:visible="showAddDialog"
      :header="editingChannel ? '编辑渠道' : '添加渠道'"
      :confirm-btn="{ loading: submitting }"
      @confirm="submitChannel"
      @close="resetForm"
    >
      <t-form ref="formRef" :data="formData" :rules="formRules">
        <t-form-item label="渠道名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入渠道名称" />
        </t-form-item>
        <t-form-item label="渠道类型" name="type">
          <t-select
            v-model="formData.type"
            placeholder="请选择渠道类型"
            :disabled="!!editingChannel"
          >
            <t-option value="wechat-template" label="微信模板消息" />
          </t-select>
        </t-form-item>

        <!-- WeChat Template credentials -->
        <template v-if="formData.type === 'wechat-template'">
          <t-form-item label="AppID" name="appId">
            <t-input
              v-model="formData.credentials.appId"
              placeholder="微信公众号 AppID"
            />
          </t-form-item>
          <t-form-item label="AppSecret" name="appSecret">
            <t-input
              v-model="formData.credentials.appSecret"
              type="password"
              placeholder="微信公众号 AppSecret"
            />
          </t-form-item>
          <t-form-item label="模板ID" name="templateId">
            <t-input
              v-model="formData.credentials.templateId"
              placeholder="消息模板 ID"
            />
          </t-form-item>
          <t-form-item label="接收者 OpenID" name="toUser">
            <t-input
              v-model="formData.credentials.toUser"
              placeholder="接收消息的用户 OpenID"
            />
          </t-form-item>
        </template>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';

const api = useApi();

const loading = ref(true);
const channels = ref<any[]>([]);
const showAddDialog = ref(false);
const submitting = ref(false);
const editingChannel = ref<any>(null);
const formRef = ref();

const formData = reactive({
  name: '',
  type: 'wechat-template',
  credentials: {
    appId: '',
    appSecret: '',
    templateId: '',
    toUser: '',
  },
});

const formRules = {
  name: [{ required: true, message: '请输入渠道名称' }],
  type: [{ required: true, message: '请选择渠道类型' }],
};

const columns = [
  { colKey: 'name', title: '名称', width: 200 },
  { colKey: 'type', title: '类型', width: 150 },
  { colKey: 'enabled', title: '状态', width: 100, cell: 'enabled' },
  { colKey: 'updatedAt', title: '更新时间', width: 180, cell: (h: any, { row }: any) => new Date(row.updatedAt).toLocaleString('zh-CN') },
  { colKey: 'actions', title: '操作', width: 150, cell: 'actions' },
];

async function loadChannels() {
  loading.value = true;
  const res = await api.getChannels();
  loading.value = false;
  if (res.code === 0 && res.data) {
    channels.value = res.data;
  }
}

function editChannel(channel: any) {
  editingChannel.value = channel;
  formData.name = channel.name;
  formData.type = channel.type;
  formData.credentials = { ...channel.credentials };
  showAddDialog.value = true;
}

function resetForm() {
  editingChannel.value = null;
  formData.name = '';
  formData.type = 'wechat-template';
  formData.credentials = {
    appId: '',
    appSecret: '',
    templateId: '',
    toUser: '',
  };
}

async function submitChannel() {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;

  submitting.value = true;

  try {
    if (editingChannel.value) {
      await api.updateChannel(editingChannel.value.id, {
        name: formData.name,
        credentials: formData.credentials,
      });
      MessagePlugin.success('渠道更新成功');
    } else {
      await api.createChannel({
        name: formData.name,
        type: formData.type,
        enabled: true,
        credentials: formData.credentials,
      });
      MessagePlugin.success('渠道添加成功');
    }
    showAddDialog.value = false;
    resetForm();
    loadChannels();
  } catch (e) {
    MessagePlugin.error('操作失败');
  } finally {
    submitting.value = false;
  }
}

async function toggleChannel(id: string, enabled: boolean) {
  await api.updateChannel(id, { enabled });
  loadChannels();
}

async function deleteChannel(id: string) {
  await api.deleteChannel(id);
  MessagePlugin.success('渠道已删除');
  loadChannels();
}

onMounted(loadChannels);
</script>

<style scoped>
.channels-page {
  max-width: 1000px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
