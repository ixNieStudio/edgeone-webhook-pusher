<template>
  <div class="messages-page">
    <t-card :bordered="false">
      <template #header>
        <span>消息历史</span>
      </template>

      <t-loading :loading="loading">
        <t-table
          :data="messages"
          :columns="columns"
          row-key="id"
          hover
          :pagination="pagination"
          @page-change="handlePageChange"
        >
          <template #deliveries="{ row }">
            <t-space size="small">
              <t-tag
                v-for="(d, i) in row.deliveries"
                :key="i"
                :theme="getStatusTheme(d.status)"
                size="small"
              >
                {{ d.channelName }}: {{ getStatusText(d.status) }}
              </t-tag>
            </t-space>
          </template>
          <template #actions="{ row }">
            <t-button
              theme="default"
              variant="text"
              @click="showDetail(row)"
            >
              详情
            </t-button>
          </template>
        </t-table>
      </t-loading>
    </t-card>

    <!-- Detail Dialog -->
    <t-dialog
      v-model:visible="showDetailDialog"
      header="消息详情"
      :footer="false"
      width="600px"
    >
      <template v-if="selectedMessage">
        <t-descriptions :column="1" bordered>
          <t-descriptions-item label="消息ID">
            {{ selectedMessage.id }}
          </t-descriptions-item>
          <t-descriptions-item label="标题">
            {{ selectedMessage.title }}
          </t-descriptions-item>
          <t-descriptions-item label="内容">
            <pre class="message-content">{{ selectedMessage.desp || '无' }}</pre>
          </t-descriptions-item>
          <t-descriptions-item label="创建时间">
            {{ formatTime(selectedMessage.createdAt) }}
          </t-descriptions-item>
        </t-descriptions>

        <t-divider>投递状态</t-divider>

        <t-list>
          <t-list-item
            v-for="(d, i) in selectedMessage.deliveries"
            :key="i"
          >
            <t-list-item-meta
              :title="d.channelName"
              :description="d.sentAt ? `发送时间: ${formatTime(d.sentAt)}` : ''"
            />
            <template #action>
              <t-tag :theme="getStatusTheme(d.status)">
                {{ getStatusText(d.status) }}
              </t-tag>
            </template>
          </t-list-item>
        </t-list>

        <t-alert
          v-if="selectedMessage.deliveries.some((d: any) => d.error)"
          theme="error"
          title="错误信息"
          style="margin-top: 16px"
        >
          <template v-for="(d, i) in selectedMessage.deliveries" :key="i">
            <div v-if="d.error">{{ d.channelName }}: {{ d.error }}</div>
          </template>
        </t-alert>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
const api = useApi();

const loading = ref(true);
const messages = ref<any[]>([]);
const total = ref(0);
const showDetailDialog = ref(false);
const selectedMessage = ref<any>(null);

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
  showPageSize: true,
});

const columns = [
  { colKey: 'title', title: '标题', ellipsis: true },
  { colKey: 'createdAt', title: '时间', width: 180, cell: (h: any, { row }: any) => formatTime(row.createdAt) },
  { colKey: 'deliveries', title: '投递状态', width: 250, cell: 'deliveries' },
  { colKey: 'actions', title: '操作', width: 100, cell: 'actions' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN');
}

type TagTheme = 'default' | 'success' | 'danger' | 'warning' | 'primary';

function getStatusTheme(status: string): TagTheme {
  const themes: Record<string, TagTheme> = {
    success: 'success',
    failed: 'danger',
    pending: 'warning',
  };
  return themes[status] || 'default';
}

function getStatusText(status: string) {
  const texts: Record<string, string> = {
    success: '成功',
    failed: '失败',
    pending: '发送中',
  };
  return texts[status] || status;
}

async function loadMessages() {
  loading.value = true;
  const res = await api.getMessages({
    page: pagination.current,
    limit: pagination.pageSize,
  });
  loading.value = false;

  if (res.code === 0 && res.data) {
    messages.value = res.data.items;
    pagination.total = res.data.total;
  }
}

function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  loadMessages();
}

function showDetail(msg: any) {
  selectedMessage.value = msg;
  showDetailDialog.value = true;
}

onMounted(loadMessages);
</script>

<style scoped>
.messages-page {
  max-width: 1000px;
}

.message-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
}
</style>
