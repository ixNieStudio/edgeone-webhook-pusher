<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
  >
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-md">
        <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
          <h3 class="font-semibold text-gray-800 dark:text-gray-200">新建应用</h3>
          <button
            type="button"
            class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="handleClose"
          >
            <Icon icon="heroicons:x-mark" class="text-xl" />
          </button>
        </div>
        <div class="p-4">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">应用名称</label>
              <input v-model="form.name" placeholder="请输入应用名称" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">关联渠道</label>
              <select v-model="form.channelId" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                <option value="" disabled>请选择渠道</option>
                <option v-for="ch in channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
              </select>
            </div>
            <!-- WeChat specific fields -->
            <template v-if="selectedChannelType === 'wechat'">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">推送模式</label>
                <div class="space-y-2">
                  <label v-for="opt in pushModeOptions" :key="opt.value" class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="form.pushMode" :value="opt.value" class="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ opt.label }}</span>
                  </label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">消息类型</label>
                <div class="space-y-2">
                  <label v-for="opt in messageTypeOptions" :key="opt.value" class="flex items-start gap-2 cursor-pointer">
                    <input type="radio" v-model="form.messageType" :value="opt.value" class="w-4 h-4 mt-0.5 text-primary-600 border-gray-300 focus:ring-primary-500" />
                    <div class="flex-1">
                      <span class="text-sm text-gray-700 dark:text-gray-300">{{ opt.label }}</span>
                      <p v-if="opt.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ opt.description }}</p>
                    </div>
                  </label>
                </div>
              </div>
              <!-- Template Message Guide -->
              <div v-if="form.messageType === 'template'" class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div class="flex items-start gap-2 mb-2">
                  <Icon icon="heroicons:light-bulb" class="text-yellow-600 dark:text-yellow-400 text-lg shrink-0 mt-0.5" />
                  <div class="flex-1">
                    <div class="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">模板消息配置要求</div>
                    <div class="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                      使用模板消息需要先在微信公众平台创建模板。推荐使用以下格式（可突破48小时限制）：
                    </div>
                    <pre class="text-xs bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1.5 rounded mb-2 overflow-x-auto" v-pre>标题：{{first.DATA}}
内容：{{keyword1.DATA}}
备注：{{remark.DATA}}</pre>
                    <div class="text-xs text-yellow-700 dark:text-yellow-400 mb-1 font-medium">Webhook 参数映射：</div>
                    <ul class="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5">
                      <li>• <code class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">title</code> → <code class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">first</code> (消息标题)</li>
                      <li>• <code class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">desp</code> → <code class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">keyword1</code> (消息内容)</li>
                      <li>• 备注信息自动填充到 <code class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">remark</code></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div v-if="form.messageType === 'template'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模板 ID</label>
                <input v-model="templateId" placeholder="微信模板消息 ID" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">在微信公众平台创建模板后获得的模板 ID</p>
              </div>
            </template>
            <!-- WorkWeChat specific fields -->
            <template v-if="selectedChannelType === 'work_wechat'">
              <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div class="flex items-start gap-2">
                  <Icon icon="heroicons:information-circle" class="text-blue-600 dark:text-blue-400 text-lg shrink-0 mt-0.5" />
                  <div class="text-sm text-blue-700 dark:text-blue-400">
                    <div class="font-medium mb-1">企业微信应用配置</div>
                    <div class="text-xs">企业微信应用暂不支持通过前端创建，请使用 API 直接创建。</div>
                  </div>
                </div>
              </div>
            </template>
            <!-- Webhook channels (DingTalk/Feishu) -->
            <template v-if="selectedChannelType === 'dingtalk' || selectedChannelType === 'feishu'">
              <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div class="flex items-start gap-2">
                  <Icon icon="heroicons:check-circle" class="text-green-600 dark:text-green-400 text-lg shrink-0 mt-0.5" />
                  <div class="text-sm text-green-700 dark:text-green-400">
                    <div class="font-medium mb-1">{{ selectedChannelType === 'dingtalk' ? '钉钉群机器人' : '飞书群机器人' }}</div>
                    <div class="text-xs">应用将使用渠道配置的 Webhook URL 发送消息，无需额外配置。</div>
                  </div>
                </div>
              </div>
            </template>
            <div class="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              <div class="flex items-start gap-3">
                <Icon icon="heroicons:information-circle" class="text-xl shrink-0 mt-0.5" />
                <p class="text-sm">创建后可通过 Webhook URL 发送消息</p>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
          <button class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" @click="handleClose">取消</button>
          <button :disabled="creating" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors" @click="handleCreate">
            <Icon v-if="creating" icon="heroicons:arrow-path" class="text-base animate-spin" />
            创建
          </button>
        </div>
      </div>
      <div class="fixed inset-0 bg-black/50 -z-10" @click="handleClose"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Channel, CreateAppInput } from '~/types';
import { PushModes, MessageTypes } from '~/types';

interface Props {
  show: boolean;
  channels: Channel[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  created: [appId: string];
}>();

const api = useApi();
const toast = useToast();

const creating = ref(false);
const templateId = ref('');

const form = ref<CreateAppInput>({
  name: '',
  channelId: '',
  pushMode: PushModes.SINGLE,
  messageType: MessageTypes.NORMAL,
});

const selectedChannelType = computed(() => {
  if (!form.value.channelId) return null;
  const channel = props.channels.find(c => c.id === form.value.channelId);
  return channel?.type || null;
});

const pushModeOptions = [
  { label: '单播（发送给第一个绑定用户）', value: PushModes.SINGLE },
  { label: '订阅（发送给所有绑定用户）', value: PushModes.SUBSCRIBE },
];

const messageTypeOptions = [
  { 
    label: '普通消息', 
    value: MessageTypes.NORMAL,
    description: '客服消息，48小时内可推送。建议用户打开公众号定位推送以保持互动。'
  },
  { 
    label: '模板消息', 
    value: MessageTypes.TEMPLATE,
    description: '无48小时限制。正式公众号已停止新申请，推荐使用测试号自定义模板。',
  },
];

function handleClose() {
  emit('close');
  resetForm();
}

async function handleCreate() {
  if (!form.value.name.trim()) {
    toast.add({ title: '请输入应用名称', color: 'warning' });
    return;
  }
  if (!form.value.channelId) {
    toast.add({ title: '请选择渠道', color: 'warning' });
    return;
  }
  if (form.value.messageType === MessageTypes.TEMPLATE && !templateId.value.trim()) {
    toast.add({ title: '模板消息需要填写模板 ID', color: 'warning' });
    return;
  }
  
  creating.value = true;
  try {
    const data: CreateAppInput = {
      name: form.value.name.trim(),
      channelId: form.value.channelId,
      pushMode: form.value.pushMode,
      messageType: form.value.messageType,
    };
    if (form.value.messageType === MessageTypes.TEMPLATE) {
      data.templateId = templateId.value.trim();
    }
    const res = await api.createApp(data);
    toast.add({ title: '创建成功', color: 'success' });
    emit('created', res.data?.id || '');
    emit('close');
    resetForm();
  } catch (e: unknown) {
    const err = e as Error;
    toast.add({ title: err.message || '创建失败', color: 'error' });
  } finally {
    creating.value = false;
  }
}

function resetForm() {
  form.value = {
    name: '',
    channelId: '',
    pushMode: PushModes.SINGLE,
    messageType: MessageTypes.NORMAL,
  };
  templateId.value = '';
}
</script>
