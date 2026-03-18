<template>
  <section id="app-usage-guide" class="surface-panel p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <div class="empty-state-icon flex size-9 items-center justify-center rounded-[1rem]">
            <AppIcon name="rocket" :size="16" />
          </div>
          <div class="text-app text-sm font-semibold">
            {{ app.deliveryType === 'wechat' ? '微信消息能力' : app.deliveryType === 'work_wechat' ? '企业微信消息能力' : app.connectionMode === 'inline_webhook' ? 'Webhook 使用' : '使用引导' }}
          </div>
        </div>
        <p class="mt-2 text-sm leading-[1.7] text-subtle">
          {{ guideSummary }}
        </p>
      </div>
      <span :class="app.connectionMode === 'inline_webhook' ? 'badge-cyan' : 'badge-neutral'" class="badge-base">
        {{ app.connectionMode === 'inline_webhook' ? '直接 webhook' : 'App-first' }}
      </span>
    </div>

    <div class="mt-5 grid gap-3 lg:grid-cols-2">
      <div class="surface-inset px-4 py-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">AppKey</div>
            <div class="text-app mt-2 break-all text-sm font-semibold mono">{{ app.key }}</div>
          </div>
          <button class="icon-button shrink-0" type="button" @click="copyText(app.key, 'AppKey')">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
        <p class="mt-2 text-sm leading-[1.55] text-subtle">
          你的 AppKey 就是 send 地址中 <code class="rounded bg-[var(--color-panel-strong)] px-1.5 py-0.5 mono">/send/</code>
          后面的这一段。
        </p>
      </div>

      <div class="surface-inset px-4 py-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Send URL</div>
            <div class="text-app mt-2 break-all text-sm font-semibold mono">{{ sendUrl }}</div>
          </div>
          <button class="icon-button shrink-0" type="button" @click="copyText(sendUrl, '发送地址')">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
        <p class="mt-2 text-sm leading-[1.55] text-subtle">
          {{ sendUrlHint }}
        </p>
      </div>
    </div>

    <div class="alert-warning mt-4 px-4 py-4 text-sm leading-[1.6]">
      {{ sendWarning }}
    </div>

    <div class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.74fr),minmax(0,1.26fr)]">
      <div class="space-y-4">
        <div class="surface-inset px-4 py-4">
          <div class="text-app text-sm font-semibold">参数说明</div>
          <div class="mt-3 grid gap-2 text-sm text-subtle">
            <template v-if="isSimplifiedDelivery">
              <div><code class="mono">title</code>：必填，消息标题。</div>
              <div><code class="mono">desp</code>：正文内容；网页类型必填。</div>
              <div><code class="mono">type</code>：`text`（文本）或 `page`（网页），不传则使用应用默认值。</div>
              <div><code class="mono">url</code>：文本类型可选；网页类型即使传入也会被系统忽略。</div>
              <div>网页类型会自动生成项目详情页，并截取正文前 20 个字作为摘要。</div>
            </template>
            <template v-else>
              <div><code class="mono">title</code>：必填，消息标题。</div>
              <div><code class="mono">desp</code>：兼容旧版内容字段，简单文本继续可用。</div>
              <div><code class="mono">content</code>：富正文，优先级高于 `desp`。</div>
              <div><code class="mono">format</code>：`text | markdown | html`。</div>
              <div><code class="mono">summary / short</code>：摘要；`summary` 优先级更高。</div>
              <div><code class="mono">url</code>：原始跳转链接；模板消息会按应用策略决定直跳还是走详情页。</div>
              <div v-if="templateOptions.length"><code class="mono">template</code>：模板预设 key，例如 `{{ templateOptions[0] }}`。</div>
            </template>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="surface-inset px-4 py-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-app text-sm font-semibold">发送调用示例</div>
              <p class="mt-1 text-sm leading-[1.55] text-subtle">
                浏览器示例等价于 GET，请注意 query 参数需要 urlencode；复杂内容建议直接复制 POST 版本。
              </p>
            </div>
            <div class="nav-pill-group inline-flex rounded-full p-1">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                :class="activeTab === tab.key ? 'nav-pill-active' : 'nav-pill-idle'"
                class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                type="button"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="code-surface mt-4 max-w-full overflow-hidden px-4 py-4">
            <pre class="max-w-full text-sm leading-7 whitespace-pre-wrap break-all [overflow-wrap:anywhere] mono">{{ exampleCode }}</pre>
          </div>

          <div class="mt-3 flex flex-wrap gap-2.5">
            <button class="button-secondary" type="button" @click="copyText(copyableExampleCode, `${activeTabLabel} 示例`)">
              <AppIcon name="copy" :size="16" />
              <span>复制 {{ activeTabLabel }} 示例</span>
            </button>
          </div>
        </div>

        <div id="app-usage-test" class="surface-inset px-4 py-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-app text-sm font-semibold">测试发送</div>
              <p class="mt-1 text-sm leading-[1.55] text-subtle">
                直接使用当前应用配置发送一条测试消息，不会影响对外的 send 兼容地址。
              </p>
            </div>
            <button class="button-primary" type="button" :disabled="testing" @click="sendTest">
              <AppIcon name="play" :size="16" />
              <span>{{ testing ? '发送中…' : '发送测试消息' }}</span>
            </button>
          </div>

          <div class="mt-4 grid gap-3">
            <div>
              <label class="field-label" for="usage-test-title">标题</label>
              <input id="usage-test-title" v-model.trim="testForm.title" type="text" class="input-base" />
            </div>

            <div class="grid gap-3 lg:grid-cols-2">
              <template v-if="isSimplifiedDelivery">
                <div>
                  <label class="field-label" for="usage-test-type">消息类型</label>
                  <select id="usage-test-type" v-model="testForm.messageType" class="select-base">
                    <option value="text">文本</option>
                    <option value="page">网页</option>
                  </select>
                </div>
              </template>
              <template v-else>
                <div>
                  <label class="field-label" for="usage-test-format">内容格式</label>
                  <select id="usage-test-format" v-model="testForm.format" class="select-base">
                    <option value="text">纯文本</option>
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                  </select>
                </div>

                <div v-if="templateOptions.length">
                  <label class="field-label" for="usage-test-template">模板预设</label>
                  <select id="usage-test-template" v-model="testForm.template" class="select-base">
                    <option value="">默认模板</option>
                    <option v-for="item in templateOptions" :key="item" :value="item">{{ item }}</option>
                  </select>
                </div>
              </template>
            </div>

            <div v-if="isSimplifiedDelivery && isPageMessage" class="text-xs text-subtle">
              网页类型会自动生成摘要与详情页链接；即使请求里带了外部链接，系统也会忽略。
            </div>

            <div v-if="!isSimplifiedDelivery">
              <label class="field-label" for="usage-test-summary">摘要（可选）</label>
              <input id="usage-test-summary" v-model.trim="testForm.summary" type="text" class="input-base" />
            </div>

            <div v-if="!isSimplifiedDelivery || !isPageMessage">
              <label class="field-label" for="usage-test-url">
                {{ isSimplifiedDelivery ? '链接（可选）' : '跳转链接（可选）' }}
              </label>
              <input
                id="usage-test-url"
                v-model.trim="testForm.url"
                type="url"
                class="input-base mono"
                placeholder="https://example.com/detail?id=1"
              />
            </div>

            <div>
              <label class="field-label" for="usage-test-content">{{ isSimplifiedDelivery ? '正文（desp）' : '正文' }}</label>
              <textarea id="usage-test-content" v-model="testForm.content" class="textarea-base" />
            </div>
          </div>

          <div
            v-if="testResult"
            class="surface-panel mt-4 px-4 py-4 text-sm leading-6"
          >
            <div class="text-app font-semibold">
              推送结果：成功 {{ testResult.success }} / 失败 {{ testResult.failed }}
            </div>
            <div class="mt-2 text-subtle">Push ID：{{ testResult.pushId }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { ManagedAppLiteDetail, PushResult } from '~/types';
import { useAppApi } from '~/composables/api/useAppApi';
import { showToast } from '~/composables/useToast';
import AppIcon from '~/shared/icons/AppIcon.vue';

type UsageTabKey = 'curl' | 'post' | 'browser';

const props = defineProps<{
  app: ManagedAppLiteDetail;
}>();

const appApi = useAppApi();
const isSimplifiedDelivery = computed(() => (
  props.app.deliveryType === 'wechat' || props.app.deliveryType === 'work_wechat'
));
const tabs: Array<{ key: UsageTabKey; label: string }> = [
  { key: 'curl', label: 'cURL' },
  { key: 'post', label: 'POST' },
  { key: 'browser', label: '浏览器' },
];

const activeTab = ref<UsageTabKey>('curl');
const testing = ref(false);
const testResult = ref<PushResult | null>(null);
const testForm = reactive({
  title: 'EdgeOne MCP Pusher 测试消息',
  content: '这是一条来自后台控制台的测试发送。',
  format: 'text' as 'text' | 'markdown' | 'html',
  messageType: 'text' as 'text' | 'page',
  url: '',
  summary: '',
  template: '',
});
const isPageMessage = computed(() => isSimplifiedDelivery.value && testForm.messageType === 'page');

const templateOptions = computed(() => (props.app.messageProfile.templateProfiles || [])
  .filter((item) => item.enabled !== false)
  .map((item) => item.key));

const sendUrl = computed(() => {
  const origin = import.meta.client ? window.location.origin.replace(/\/+$/, '') : '';
  return origin ? `${origin}/send/${props.app.key}` : `/send/${props.app.key}`;
});

const sendUrlHint = computed(() => {
  if (isSimplifiedDelivery.value) {
    return '兼容旧的 `title/desp`，新增支持 `type=text|page`；文本可带 url，网页自动生成详情页并忽略外部 url。';
  }
  return '兼容旧的 `title/desp`，也支持 `content / format / url / summary / template` 这些扩展参数。';
});

const sendWarning = computed(() => {
  if (isSimplifiedDelivery.value) {
    return '`GET` 仅适合轻量调用，所有参数值都应该只做一次 UTF-8 urlencode。文本和网页都建议优先使用 `title + desp`，复杂场景请直接用 `POST JSON`。';
  }
  return '`GET` 仅适合轻量调用，所有参数值都应该只做一次 UTF-8 urlencode。`Markdown / HTML / 长链接 / 复杂 query` 建议优先使用 `POST JSON`。';
});

const browserUrl = computed(() => {
  const params = new URLSearchParams({
    title: '测试消息',
    ...(isSimplifiedDelivery.value
      ? { desp: sampleBody.value, type: sampleSendType.value }
      : { content: sampleBody.value, format: sampleFormat.value }),
  });

  if (!isSimplifiedDelivery.value && sampleSummary.value) {
    params.set('summary', sampleSummary.value);
  }
  if (sampleUrl.value && (!isSimplifiedDelivery.value || !isPageMessage.value)) {
    params.set('url', sampleUrl.value);
  }
  if (!isSimplifiedDelivery.value && sampleTemplate.value) {
    params.set('template', sampleTemplate.value);
  }

  return `${sendUrl.value}?${params.toString()}`;
});

const sampleQueryEntries = computed(() => {
  const entries: Array<[string, string]> = [['title', '测试消息']];

  if (isSimplifiedDelivery.value) {
    entries.push(['desp', sampleBody.value]);
    entries.push(['type', sampleSendType.value]);
  } else {
    entries.push(['content', sampleBody.value]);
    entries.push(['format', sampleFormat.value]);
  }

  if (!isSimplifiedDelivery.value && sampleSummary.value) {
    entries.push(['summary', sampleSummary.value]);
  }
  if (sampleUrl.value && (!isSimplifiedDelivery.value || !isPageMessage.value)) {
    entries.push(['url', sampleUrl.value]);
  }
  if (!isSimplifiedDelivery.value && sampleTemplate.value) {
    entries.push(['template', sampleTemplate.value]);
  }

  return entries;
});

const curlGetExample = computed(() => {
  const lines = [`curl --get "${sendUrl.value}" \\`];

  sampleQueryEntries.value.forEach(([key, value], index) => {
    const suffix = index === sampleQueryEntries.value.length - 1 ? '' : ' \\';
    lines.push(`  --data-urlencode "${escapeShellArg(`${key}=${value}`)}"${suffix}`);
  });

  return lines.join('\n');
});

const postPayload = computed(() => {
  const payload: Record<string, string> = { title: '测试消息' };

  if (isSimplifiedDelivery.value) {
    payload.desp = sampleBody.value;
    payload.type = sampleSendType.value;
  } else {
    payload.content = sampleBody.value;
    payload.format = sampleFormat.value;
  }

  if (!isSimplifiedDelivery.value && sampleSummary.value) {
    payload.summary = sampleSummary.value;
  }
  if (sampleUrl.value && (!isSimplifiedDelivery.value || !isPageMessage.value)) {
    payload.url = sampleUrl.value;
  }
  if (!isSimplifiedDelivery.value && sampleTemplate.value) {
    payload.template = sampleTemplate.value;
  }

  return payload;
});

const postExample = computed(() => [
  `curl -X POST "${sendUrl.value}" \\`,
  '  -H "Content-Type: application/json" \\',
  "  --data-binary @- <<'JSON'",
  JSON.stringify(postPayload.value, null, 2),
  'JSON',
].join('\n'));

const browserExample = computed(() => formatWrappedBrowserUrl(sendUrl.value, sampleQueryEntries.value));

const exampleCode = computed(() => {
  if (activeTab.value === 'post') return postExample.value;
  if (activeTab.value === 'browser') return browserExample.value;
  return curlGetExample.value;
});

const copyableExampleCode = computed(() => {
  if (activeTab.value === 'browser') return browserUrl.value;
  return exampleCode.value;
});

const activeTabLabel = computed(() => tabs.find((tab) => tab.key === activeTab.value)?.label || 'cURL');
const sampleFormat = computed(() => {
  if (props.app.deliveryType === 'wechat') {
    return props.app.messageProfile.contentFormatDefault || 'markdown';
  }
  return 'text';
});
const sampleSendType = computed(() => {
  if (!isSimplifiedDelivery.value) {
    return 'text';
  }
  return props.app.messageProfile.defaultSendType === 'page' ? 'page' : 'text';
});
const sampleBody = computed(() => {
  if (isSimplifiedDelivery.value) {
    return 'CPU 使用率超过 90%，请打开详情页查看告警上下文与处理建议。';
  }
  if (sampleFormat.value === 'html') {
    return '<h2>系统告警</h2><p>CPU 使用率超过 <strong>90%</strong>，请点击查看详情。</p>';
  }
  if (sampleFormat.value === 'markdown') {
    return '# 系统告警\n\nCPU 使用率超过 **90%**，请点击查看详情。';
  }
  return '这是一条示例消息内容。';
});
const sampleSummary = computed(() => {
  if (isSimplifiedDelivery.value) {
    return '';
  }
  return props.app.deliveryType === 'wechat' ? '这是自动发送到微信模板摘要区的文案。' : '';
});
const sampleUrl = computed(() => {
  if (isSimplifiedDelivery.value) {
    return sampleSendType.value === 'text' ? 'https://example.com/detail?id=1001&source=wechat' : '';
  }
  return props.app.deliveryType === 'wechat' ? 'https://example.com/detail?id=1001&source=wechat' : '';
});
const sampleTemplate = computed(() => templateOptions.value[0] || '');

const guideSummary = computed(() => {
  if (isSimplifiedDelivery.value) {
    return '当前仅支持文本/网页两种类型：文本支持可选链接，网页自动生成摘要与详情页。';
  }
  return '直接展示 AppKey、send URL 和调用示例，方便你把当前应用接到任意外部系统。';
});

watch(() => props.app.id, () => {
  activeTab.value = 'curl';
  testResult.value = null;
  testForm.title = 'EdgeOne MCP Pusher 测试消息';
  testForm.content = '这是一条来自后台控制台的测试发送。';
  const defaultMessageType = isSimplifiedDelivery.value && props.app.messageProfile.defaultSendType === 'page'
    ? 'page'
    : 'text';
  testForm.messageType = defaultMessageType;
  testForm.format = (isSimplifiedDelivery.value
    ? 'text'
    : (props.app.messageProfile.contentFormatDefault || 'text')) as 'text' | 'markdown' | 'html';
  testForm.url = '';
  testForm.summary = '';
  testForm.template = templateOptions.value[0] || '';
}, { immediate: true });

watch(() => testForm.messageType, (value) => {
  if (!isSimplifiedDelivery.value) return;
  testForm.format = 'text';
  if (value === 'page') {
    testForm.url = '';
  }
});

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  showToast(`${label}已复制`, 'success');
}

function escapeShellArg(value: string) {
  return value
    .replace(/\n/g, '\\n')
    .replace(/(["`$\\])/g, '\\$1');
}

function formatWrappedBrowserUrl(baseUrl: string, entries: Array<[string, string]>) {
  if (entries.length === 0) {
    return baseUrl;
  }
  const lines = [baseUrl];
  entries.forEach(([key, value], index) => {
    lines.push(`${index === 0 ? '?' : '&'}${key}=${encodeURIComponent(value)}`);
  });

  return lines.join('\n');
}

async function sendTest() {
  testing.value = true;

  try {
    const payload: {
      title: string;
      desp?: string;
      content?: string;
      type?: 'text' | 'page';
      format?: 'text' | 'markdown' | 'html';
      url?: string;
      summary?: string;
      template?: string;
    } = {
      title: testForm.title,
      ...(isSimplifiedDelivery.value
        ? {
            desp: testForm.content,
            type: testForm.messageType,
          }
        : {
            content: testForm.content,
            format: testForm.format,
          }),
    };

    if (isSimplifiedDelivery.value) {
      if (testForm.messageType === 'text' && testForm.url) {
        payload.url = testForm.url;
      }
    } else {
      if (testForm.url) payload.url = testForm.url;
      if (testForm.summary) payload.summary = testForm.summary;
      if (testForm.template) payload.template = testForm.template;
    }

    const response = await appApi.testSend(props.app.id, payload);
    testResult.value = response.data;
    showToast('测试消息已发送', 'success');
  } catch (error) {
    showToast(error instanceof Error ? error.message : '测试发送失败', 'error');
  } finally {
    testing.value = false;
  }
}
</script>
