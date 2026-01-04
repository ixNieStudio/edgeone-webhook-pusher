<template>
  <div class="dashboard">
    <t-row :gutter="[24, 24]">
      <t-col :span="12">
        <t-card title="SendKey" :bordered="false">
          <div class="sendkey-section">
            <t-input
              v-model="sendKey"
              readonly
              size="large"
              placeholder="加载中..."
            >
              <template #suffix>
                <t-button
                  theme="default"
                  variant="text"
                  @click="copySendKey"
                >
                  <t-icon name="file-copy" />
                </t-button>
              </template>
            </t-input>
            <p class="tip">请妥善保管您的 SendKey，不要泄露给他人</p>
          </div>
        </t-card>
      </t-col>

      <t-col :span="12">
        <t-card title="快速开始" :bordered="false">
          <div class="quick-start">
            <p>使用以下 URL 发送消息：</p>
            <t-input
              :value="webhookUrl"
              readonly
              size="large"
            >
              <template #suffix>
                <t-button
                  theme="default"
                  variant="text"
                  @click="copyWebhookUrl"
                >
                  <t-icon name="file-copy" />
                </t-button>
              </template>
            </t-input>
          </div>
        </t-card>
      </t-col>

      <t-col :span="24">
        <t-card title="使用说明" :bordered="false">
          <t-tabs default-value="get">
            <t-tab-panel value="get" label="GET 请求">
              <pre class="code-block">{{ getExample }}</pre>
            </t-tab-panel>
            <t-tab-panel value="post-json" label="POST JSON">
              <pre class="code-block">{{ postJsonExample }}</pre>
            </t-tab-panel>
            <t-tab-panel value="post-form" label="POST Form">
              <pre class="code-block">{{ postFormExample }}</pre>
            </t-tab-panel>
          </t-tabs>
        </t-card>
      </t-col>

      <t-col :span="12">
        <t-card title="渠道状态" :bordered="false">
          <t-loading :loading="channelsLoading">
            <t-list v-if="channels.length > 0">
              <t-list-item v-for="ch in channels" :key="ch.id">
                <t-list-item-meta
                  :title="ch.name"
                  :description="ch.type"
                />
                <template #action>
                  <t-tag :theme="ch.enabled ? 'success' : 'default'">
                    {{ ch.enabled ? '已启用' : '已禁用' }}
                  </t-tag>
                </template>
              </t-list-item>
            </t-list>
            <t-empty v-else description="暂无渠道，请先添加" />
          </t-loading>
        </t-card>
      </t-col>

      <t-col :span="12">
        <t-card title="最近消息" :bordered="false">
          <t-loading :loading="messagesLoading">
            <t-list v-if="messages.length > 0">
              <t-list-item v-for="msg in messages" :key="msg.id">
                <t-list-item-meta
                  :title="msg.title"
                  :description="formatTime(msg.createdAt)"
                />
              </t-list-item>
            </t-list>
            <t-empty v-else description="暂无消息" />
          </t-loading>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';

const api = useApi();

const sendKey = ref('');
const channels = ref<any[]>([]);
const messages = ref<any[]>([]);
const channelsLoading = ref(true);
const messagesLoading = ref(true);

const webhookUrl = computed(() => {
  const base = window.location.origin;
  return sendKey.value ? `${base}/${sendKey.value}.send` : '加载中...';
});

const getExample = computed(() => {
  return `curl "${webhookUrl.value}?title=测试消息&desp=这是消息内容"`;
});

const postJsonExample = computed(() => {
  return `curl -X POST "${webhookUrl.value}" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "测试消息", "desp": "这是消息内容"}'`;
});

const postFormExample = computed(() => {
  return `curl -X POST "${webhookUrl.value}" \\
  -d "title=测试消息&desp=这是消息内容"`;
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN');
}

async function copySendKey() {
  await navigator.clipboard.writeText(sendKey.value);
  MessagePlugin.success('已复制 SendKey');
}

async function copyWebhookUrl() {
  await navigator.clipboard.writeText(webhookUrl.value);
  MessagePlugin.success('已复制 Webhook URL');
}

onMounted(async () => {
  // Load user info
  const userRes = await api.getUser();
  if (userRes.code === 0 && userRes.data) {
    sendKey.value = userRes.data.sendKey;
  }

  // Load channels
  const chRes = await api.getChannels();
  channelsLoading.value = false;
  if (chRes.code === 0 && chRes.data) {
    channels.value = chRes.data;
  }

  // Load recent messages
  const msgRes = await api.getMessages({ limit: 5 });
  messagesLoading.value = false;
  if (msgRes.code === 0 && msgRes.data) {
    messages.value = msgRes.data.items;
  }
});
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.sendkey-section .tip {
  margin-top: 8px;
  color: var(--td-text-color-secondary);
  font-size: 12px;
}

.quick-start p {
  margin: 0 0 12px;
  color: var(--td-text-color-secondary);
}

.code-block {
  background: var(--td-bg-color-secondarycontainer);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  margin: 12px 0 0;
}
</style>
