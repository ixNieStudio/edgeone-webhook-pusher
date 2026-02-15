<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <Icon icon="heroicons:book-open" class="text-primary-600 text-xl" />
        <span class="font-medium">快速开始指南</span>
      </div>
    </div>
    <div class="p-4">
      <!-- 欢迎说明 -->
      <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div class="flex items-start gap-2">
          <Icon icon="heroicons:information-circle" class="text-blue-500 text-lg shrink-0 mt-0.5" />
          <div class="text-sm text-blue-700 dark:text-blue-400">
            <div class="font-medium mb-1">欢迎使用微信消息推送系统</div>
            <div class="text-xs">按照以下步骤配置，即可通过 Webhook 向微信公众号推送消息。推荐使用测试号，可自定义模板消息突破 48 小时限制。</div>
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
            <div class="font-medium text-sm">申请微信测试号</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              访问 <a href="https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login" target="_blank" class="text-primary-600 hover:underline">微信公众平台测试号申请页面</a>，使用微信扫码登录即可获得测试号。测试号可以自定义模板消息，无需审核。
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">2</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">创建渠道并配置接口</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              在本系统的 <NuxtLink to="/channels" class="text-primary-600 hover:underline">渠道管理</NuxtLink> 页面创建渠道，填入测试号的 AppID 和 AppSecret。然后在微信测试号管理页面配置「接口配置信息」，填写服务器 URL 和 Token（创建渠道后会提供）。
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">3</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">添加模板消息（推荐）</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              在测试号管理页面找到「模板消息接口」→「新增测试模板」，填写以下内容：
            </div>
            <div class="mt-2 space-y-1">
              <div class="text-xs text-gray-600 dark:text-gray-400">
                <span class="font-medium">模板标题：</span>消息推送通知
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                <span class="font-medium">模板内容：</span>
              </div>
              <pre class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded mt-1 overflow-x-auto" v-pre>标题：{{first.DATA}}
内容：{{keyword1.DATA}}
备注：{{remark.DATA}}</pre>
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
              提交后会获得模板 ID，在创建应用时需要用到。使用模板消息可突破 48 小时限制。
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">4</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">创建应用</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              点击上方「新建」按钮创建应用。选择刚才创建的渠道，选择推送模式（单播或订阅），选择消息类型（推荐模板消息），填入模板 ID。
            </div>
            <div class="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-400">
              <div class="font-medium mb-1">推送模式说明：</div>
              <ul class="list-disc list-inside space-y-0.5">
                <li><strong>单播</strong>：只发送给第一个绑定的用户，适合个人通知</li>
                <li><strong>订阅</strong>：发送给所有绑定的用户，适合群发通知</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Step 5 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">5</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">绑定微信用户</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              创建应用后，在应用详情页面点击「生成绑定码」，使用微信扫码或发送「绑定 XXXX」消息完成绑定。绑定成功后即可接收推送消息。
            </div>
          </div>
        </div>

        <!-- Step 6 -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span class="text-primary-600 font-medium text-sm">6</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">发送消息</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              使用应用详情页面提供的 Webhook URL 发送消息。支持 GET、POST 请求和浏览器直接访问。
            </div>
            <div class="mt-2">
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">示例：</div>
              <pre class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded overflow-x-auto">curl "https://your-domain.com/send/APP_KEY?title=测试&desp=内容"</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- 额外提示 -->
      <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div>
            <div class="font-medium mb-1">关于模板消息</div>
            <ul class="list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-500">
              <li>测试号可以自定义模板内容，推荐使用</li>
              <li>正式公众号已停止新申请模板消息</li>
              <li>普通消息（客服消息）有 48 小时限制</li>
              <li>模板消息无时间限制，但需要用户关注公众号</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Channel } from '~/types';

defineProps<{
  channelId?: string;
  channel?: Channel;
}>();
</script>
