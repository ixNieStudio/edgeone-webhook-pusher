<template>
  <div class="settings-page">
    <t-row :gutter="[24, 24]">
      <t-col :span="12">
        <t-card title="SendKey 管理" :bordered="false">
          <t-form>
            <t-form-item label="当前 SendKey">
              <t-input
                v-model="sendKey"
                readonly
                size="large"
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
            </t-form-item>
            <t-form-item>
              <t-popconfirm
                content="重新生成后，旧的 SendKey 将立即失效，确定继续吗？"
                @confirm="regenerate"
              >
                <t-button
                  theme="danger"
                  variant="outline"
                  :loading="regenerating"
                >
                  <template #icon><t-icon name="refresh" /></template>
                  重新生成 SendKey
                </t-button>
              </t-popconfirm>
            </t-form-item>
          </t-form>
          <t-alert theme="warning" style="margin-top: 16px">
            <template #message>
              重新生成 SendKey 后，所有使用旧 Key 的调用都将失败，请及时更新您的配置。
            </template>
          </t-alert>
        </t-card>
      </t-col>

      <t-col :span="12">
        <t-card title="账户信息" :bordered="false">
          <t-descriptions :column="1">
            <t-descriptions-item label="创建时间">
              {{ createdAt ? formatTime(createdAt) : '-' }}
            </t-descriptions-item>
            <t-descriptions-item label="Webhook URL">
              <t-input :value="webhookUrl" readonly size="small">
                <template #suffix>
                  <t-button
                    theme="default"
                    variant="text"
                    size="small"
                    @click="copyWebhookUrl"
                  >
                    <t-icon name="file-copy" />
                  </t-button>
                </template>
              </t-input>
            </t-descriptions-item>
          </t-descriptions>
        </t-card>
      </t-col>

      <t-col :span="24">
        <t-card title="使用帮助" :bordered="false">
          <t-collapse>
            <t-collapse-panel header="如何获取微信公众号 AppID 和 AppSecret？">
              <ol>
                <li>登录 <a href="https://mp.weixin.qq.com" target="_blank">微信公众平台</a></li>
                <li>进入「设置与开发」-「基本配置」</li>
                <li>在「公众号开发信息」中查看 AppID</li>
                <li>点击「重置」获取 AppSecret（请妥善保管）</li>
              </ol>
            </t-collapse-panel>
            <t-collapse-panel header="如何创建消息模板？">
              <ol>
                <li>在微信公众平台进入「功能」-「模板消息」</li>
                <li>从模板库中选择或创建新模板</li>
                <li>复制模板 ID 填入渠道配置</li>
                <li>模板内容建议包含 <code v-pre>{{title.DATA}}</code> 和 <code v-pre>{{content.DATA}}</code> 字段</li>
              </ol>
            </t-collapse-panel>
            <t-collapse-panel header="如何获取用户 OpenID？">
              <ol>
                <li>用户需要先关注您的公众号</li>
                <li>通过网页授权或其他方式获取用户 OpenID</li>
                <li>也可以在公众平台「用户管理」中查看已关注用户的 OpenID</li>
              </ol>
            </t-collapse-panel>
          </t-collapse>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';

const api = useApi();

const sendKey = ref('');
const createdAt = ref('');
const regenerating = ref(false);

const webhookUrl = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return sendKey.value ? `${base}/${sendKey.value}.send` : '';
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

async function regenerate() {
  regenerating.value = true;
  try {
    const res = await api.regenerateSendKey();
    if (res.code === 0 && res.data) {
      sendKey.value = res.data.sendKey;
      MessagePlugin.success('SendKey 已重新生成');
    } else {
      MessagePlugin.error(res.message || '操作失败');
    }
  } catch (e) {
    MessagePlugin.error('操作失败');
  } finally {
    regenerating.value = false;
  }
}

onMounted(async () => {
  const res = await api.getUser();
  if (res.code === 0 && res.data) {
    sendKey.value = res.data.sendKey;
    createdAt.value = res.data.createdAt;
  }
});
</script>

<style scoped>
.settings-page {
  max-width: 1000px;
}

ol {
  margin: 0;
  padding-left: 20px;
  line-height: 2;
}

a {
  color: var(--td-brand-color);
}
</style>
