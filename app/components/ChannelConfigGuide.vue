<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between">
        <span class="font-medium">微信公众号测试号配置指引</span>
        <button
          v-if="!hideVerify"
          :disabled="verifying"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors"
          :class="verifyStatus === 'success' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : verifyStatus === 'error'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
          @click="handleVerify"
        >
          <Icon v-if="verifying" icon="heroicons:arrow-path" class="text-sm animate-spin" />
          <Icon v-else-if="verifyStatus === 'success'" icon="heroicons:check-circle" class="text-sm" />
          <Icon v-else-if="verifyStatus === 'error'" icon="heroicons:x-circle" class="text-sm" />
          <Icon v-else icon="heroicons:shield-check" class="text-sm" />
          {{ verifyStatus === 'success' ? '配置正常' : verifyStatus === 'error' ? '验证失败' : '验证配置' }}
        </button>
      </div>
    </div>
    <div class="p-4">
      <!-- 测试号说明 -->
      <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div class="flex items-start gap-2">
          <Icon icon="heroicons:information-circle" class="text-blue-500 text-lg shrink-0 mt-0.5" />
          <div class="text-sm text-blue-700 dark:text-blue-400">
            <div class="font-medium mb-1">推荐使用测试号</div>
            <div class="text-xs">测试号可以自定义模板消息，突破客服消息的 48 小时限制。正式公众号已停止新申请模板消息。</div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Step 1 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">1</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">申请测试号</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              访问 <a href="https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login" target="_blank" class="text-primary-600 hover:underline">微信公众平台测试号申请页面</a>，使用微信扫码登录即可获得测试号
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">2</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">获取 AppID 和 AppSecret</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              在测试号管理页面顶部可以看到 appID 和 appsecret，将它们填入本系统的渠道配置中
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">3</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">配置接口信息</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              在「接口配置信息」区域点击「修改」，填写以下信息：
            </div>
            <div class="mt-2 space-y-2">
              <div class="flex items-start gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0 pt-1">URL:</span>
                <code class="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded overflow-x-auto break-all">{{ serverUrl }}</code>
                <button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0" @click="copyToClipboard(serverUrl, '服务器 URL')">
                  <Icon icon="heroicons:clipboard" class="text-sm" />
                </button>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0 pt-1">Token:</span>
                <code v-if="msgToken" class="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">{{ msgToken }}</code>
                <span v-else class="flex-1 text-xs text-gray-400 dark:text-gray-500 italic px-2 py-1">进入具体渠道后会提供</span>
                <button v-if="msgToken" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0" @click="copyToClipboard(msgToken, 'Token')">
                  <Icon icon="heroicons:clipboard" class="text-sm" />
                </button>
              </div>
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-2">
              点击「提交」保存配置。配置成功后，用户发送的消息将转发到本系统。
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">4</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">关注测试号</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              在测试号管理页面找到「测试号二维码」，使用微信扫码关注。关注后即可接收推送消息。
            </div>
          </div>
        </div>

        <!-- Step 5 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">5</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">添加模板消息（推荐）</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              在测试号管理页面找到「模板消息接口」→「新增测试模板」，填写：
            </div>
            <div class="mt-2 space-y-1">
              <div class="text-xs text-gray-600 dark:text-gray-400">
                <span class="font-medium">模板标题：</span>消息推送通知
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                <span class="font-medium">模板内容：</span>
              </div>
              <pre class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded mt-1 overflow-x-auto" v-text="templateExample"></pre>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span class="font-medium">字段说明：</span>
              </div>
              <ul class="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside space-y-0.5">
                <li><code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">first</code> - 对应 Webhook 的 <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">title</code> 参数</li>
                <li><code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">keyword1</code> - 对应 Webhook 的 <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">desp</code> 参数</li>
                <li><code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">remark</code> - 备注信息（可选）</li>
              </ul>
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-2">
              提交后会获得模板 ID，在创建应用时选择「模板消息」并填入此 ID。使用模板消息可突破 48 小时限制。
            </div>
          </div>
        </div>

        <!-- Step 6 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">6</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">关注测试号并绑定</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              扫码关注测试号后，在本系统创建应用，选择「模板消息」类型并填入模板 ID，然后发送「绑定 XXXX1234」完成绑定。
            </div>
          </div>
        </div>
      </div>

      <!-- 正式公众号说明 -->
      <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div>
            <div class="font-medium mb-1">使用正式公众号</div>
            <div>如需使用正式公众号，请在「设置与开发」→「基本配置」→「服务器配置」中填写上述 URL 和 Token。</div>
          </div>
          <div>
            <div class="font-medium mb-1">关于模板消息</div>
            <ul class="list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-500">
              <li>测试号的模板 ID 仅用于测试，不能用于正式公众号</li>
              <li>正式公众号的模板消息只能从模板库中申请，不能自定义内容</li>
              <li>正式公众号已停止新申请模板消息</li>
              <li>客服消息（普通消息）有 48 小时限制</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="verifyError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div class="flex items-start gap-2">
          <Icon icon="heroicons:exclamation-triangle" class="text-red-500 text-lg shrink-0 mt-0.5" />
          <div class="text-sm text-red-700 dark:text-red-400">{{ verifyError }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Channel } from '~/types';

const props = defineProps<{
  channelId: string;
  channel?: Channel;
  hideVerify?: boolean;
}>();

const api = useApi();
const toast = useToast();

const verifying = ref(false);
const verifyStatus = ref<'idle' | 'success' | 'error'>('idle');
const verifyError = ref('');

const templateExample = `标题：{{first.DATA}}
内容：{{keyword1.DATA}}
备注：{{remark.DATA}}`;

const serverUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/v1/wechat/${props.channelId}`;
});

// 使用渠道配置中的 msgToken
const msgToken = computed(() => {
  return props.channel?.config?.msgToken || '';
});

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `${label}已复制`, color: 'success' });
  } catch {
    toast.add({ title: '复制失败', color: 'error' });
  }
}

async function handleVerify() {
  verifying.value = true;
  verifyError.value = '';
  try {
    await api.verifyChannel(props.channelId);
    verifyStatus.value = 'success';
    toast.add({ title: '配置验证成功', color: 'success' });
  } catch (e: unknown) {
    const err = e as Error;
    verifyStatus.value = 'error';
    verifyError.value = err.message || '验证失败，请检查 AppID 和 AppSecret 是否正确';
  } finally {
    verifying.value = false;
  }
}
</script>
