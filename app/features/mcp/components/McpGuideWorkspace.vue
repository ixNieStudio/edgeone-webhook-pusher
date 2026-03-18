<template>
  <div class="space-y-5">
    <PageContextBar
      title="MCP"
      subtitle="先确认当前项目地址，再把 baseUrl 配到 Claude Code、Cursor、Codex、OpenCode 等远程 MCP 客户端里。默认只有 send_message 可匿名调用；其余工具都需要 Bearer AT_...。"
      :status-items="statusItems"
    >
      <template #actions>
        <button class="button-secondary" type="button" @click="copyText(currentBaseUrl, '项目地址')">
          <AppIcon name="copy" :size="16" />
          <span>复制项目地址</span>
        </button>
        <button class="button-secondary" type="button" @click="copyText(currentMcpEndpoint, 'MCP 地址')">
          <AppIcon name="copy" :size="16" />
          <span>复制 MCP 地址</span>
        </button>
      </template>
    </PageContextBar>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section class="surface-panel-strong p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-app text-sm font-semibold">MCP Endpoint</div>
            <p class="mt-1.5 text-sm leading-[1.65] text-subtle">
              你要先确定当前项目的 <code class="mono">baseUrl</code>，再把远程 MCP 地址配成
              <code class="mono">baseUrl + /mcp</code>。页面下面所有客户端示例都按这个规则展开。
            </p>
          </div>
          <span class="badge-base badge-cyan">Streamable HTTP</span>
        </div>

        <div class="mt-5 grid gap-3">
          <div class="surface-inset px-4 py-4">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Current Project Base URL</div>
            <div class="text-app mt-2 break-all text-sm font-semibold mono">{{ currentBaseUrl }}</div>
            <p class="mt-2 text-sm leading-[1.55] text-subtle">
              这是当前前端页面拿到的项目地址。自托管部署后，这里就是你自己的域名。
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div class="surface-inset px-4 py-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Current MCP URL</div>
                  <div class="text-app mt-2 break-all text-sm font-semibold mono">{{ currentMcpEndpoint }}</div>
                </div>
                <button class="icon-button shrink-0" type="button" @click="copyText(currentMcpEndpoint, 'MCP 地址')">
                  <AppIcon name="copy" :size="16" />
                </button>
              </div>
              <p class="mt-2 text-sm leading-[1.55] text-subtle">
                当前站点可以直接复制这个地址接入远程 MCP。
              </p>
            </div>

            <div class="surface-inset px-4 py-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Config Template</div>
                  <div class="text-app mt-2 break-all text-sm font-semibold mono">{{ mcpEndpointTemplate }}</div>
                </div>
                <button class="icon-button shrink-0" type="button" @click="copyText(mcpEndpointTemplate, 'MCP 模板地址')">
                  <AppIcon name="copy" :size="16" />
                </button>
              </div>
              <p class="mt-2 text-sm leading-[1.55] text-subtle">
                文档或脚本里请把 <code class="mono">&lt;BASE_URL&gt;</code> 替换为你的站点域名。
              </p>
            </div>
          </div>

          <div class="surface-inset px-4 py-4">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Auth Model</div>
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="badge-base badge-emerald">send_message 匿名可用</span>
              <span class="badge-base badge-amber">其余工具 Bearer AT_...</span>
            </div>
            <p class="mt-2 text-sm leading-[1.55] text-subtle">
              匿名连接时 <code class="mono">tools/list</code> 只会看到 <code class="mono">send_message</code>。
              如果你想让 Agent 自己查 appKey、看消息历史或读系统状态，就在客户端配置里加
              <code class="mono">Authorization: Bearer &lt;AT_...&gt;</code>。
            </p>
          </div>

          <div class="surface-inset px-4 py-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Required Headers</div>
                <div class="text-app mt-2 text-sm font-semibold">协议头与管理员 Token</div>
              </div>
              <button class="icon-button shrink-0" type="button" @click="copyText(requiredHeadersText, '请求头示例')">
                <AppIcon name="copy" :size="16" />
              </button>
            </div>
            <pre class="mt-3 text-sm leading-7 whitespace-pre-wrap break-all [overflow-wrap:anywhere] mono">{{ requiredHeadersText }}</pre>
          </div>
        </div>
      </section>

      <section class="surface-panel p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-app text-sm font-semibold">接入流程</div>
            <p class="mt-1.5 text-sm leading-[1.65] text-subtle">
              先确定项目地址和 appKey，再决定客户端是走匿名发送还是管理员模式。
            </p>
          </div>
          <span class="badge-base badge-neutral">Workflow</span>
        </div>

        <div class="code-surface mt-5 px-4 py-4">
          <pre class="text-sm leading-7 whitespace-pre-wrap break-all [overflow-wrap:anywhere] mono">{{ workflowText }}</pre>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div
            v-for="(step, index) in workflowSteps"
            :key="step.title"
            class="surface-inset px-4 py-4"
          >
            <div class="badge-base badge-cyan">{{ String(index + 1).padStart(2, '0') }}</div>
            <div class="text-app mt-3 text-sm font-semibold">{{ step.title }}</div>
            <p class="mt-2 text-sm leading-[1.55] text-subtle">{{ step.description }}</p>
          </div>
        </div>

        <div class="alert-warning mt-4 px-4 py-4 text-sm leading-[1.6]">
          <div><strong>appKey 从哪里来：</strong>去「应用」页复制 AppKey，或直接取现有 <code class="mono">/send/{appKey}</code> 的最后一段。</div>
          <div class="mt-1"><strong>权限规则：</strong>只有 <code class="mono">send_message</code> 不强制 Bearer；<code class="mono">apps_list</code>、<code class="mono">apps_get</code>、消息与统计工具都需要 Bearer <code class="mono">AT_...</code>。</div>
        </div>
      </section>
    </div>

    <section class="surface-panel p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-app text-sm font-semibold">客户端配置</div>
          <p class="mt-1.5 text-sm leading-[1.65] text-subtle">
            推荐先把 <code class="mono">baseUrl</code> 理解成当前项目地址，再把客户端里的 MCP 地址配置成
            <code class="mono">baseUrl + /mcp</code>。每个客户端都给出“匿名发送”和“管理员模式”两套示例。
          </p>
        </div>
        <span class="badge-base badge-neutral">baseUrl → /mcp</span>
      </div>

      <div class="mt-5 grid gap-5 xl:grid-cols-2">
        <article
          v-for="client in clientConfigs"
          :key="client.name"
          class="surface-inset px-4 py-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-app text-sm font-semibold">{{ client.name }}</div>
              <p class="mt-1.5 text-sm leading-[1.55] text-subtle">{{ client.description }}</p>
            </div>
            <span class="badge-base badge-neutral">{{ client.location }}</span>
          </div>

          <div class="mt-4 space-y-4">
            <div
              v-for="snippet in client.snippets"
              :key="`${client.name}-${snippet.label}`"
              class="rounded-[1rem] border border-[var(--app-border)] px-3.5 py-3.5"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-app text-sm font-semibold">{{ snippet.label }}</div>
                  <p class="mt-1 text-sm leading-[1.5] text-subtle">{{ snippet.description }}</p>
                </div>
                <button class="icon-button shrink-0" type="button" @click="copyText(snippet.code, `${client.name} ${snippet.label}`)">
                  <AppIcon name="copy" :size="16" />
                </button>
              </div>
              <div class="code-surface mt-3 px-3.5 py-3.5">
                <pre class="text-sm leading-7 whitespace-pre-wrap break-all [overflow-wrap:anywhere] mono">{{ snippet.code }}</pre>
              </div>
            </div>
          </div>

          <div class="mt-4 text-sm leading-[1.6] text-subtle">
            {{ client.note }}
          </div>
        </article>
      </div>
    </section>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
      <section class="surface-panel p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-app text-sm font-semibold">Tools 与权限</div>
            <p class="mt-1.5 text-sm leading-[1.65] text-subtle">
              真正决定 Agent 能做什么的是 <code class="mono">tools/list</code> 里能看到哪些工具。匿名连接与管理员连接看到的集合不同。
            </p>
          </div>
          <span class="badge-base badge-neutral">tools/list</span>
        </div>

        <div class="mt-5 grid gap-3">
          <div
            v-for="tool in toolMatrix"
            :key="tool.name"
            class="surface-inset px-4 py-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <code class="mono text-sm font-semibold">{{ tool.name }}</code>
              <span :class="tool.badgeClass" class="badge-base">{{ tool.access }}</span>
              <span v-if="tool.mode" class="badge-base badge-neutral">{{ tool.mode }}</span>
            </div>
            <p class="mt-2 text-sm leading-[1.55] text-subtle">{{ tool.description }}</p>
          </div>
        </div>
      </section>

      <section class="surface-panel p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-app text-sm font-semibold">send_message 示例</div>
            <p class="mt-1.5 text-sm leading-[1.65] text-subtle">
              只要你已经有 <code class="mono">appKey</code>，匿名模式也能直接发送。<code class="mono">page</code> 模式必须补 <code class="mono">body</code>。
            </p>
          </div>
          <button class="icon-button shrink-0" type="button" @click="copyText(sendMessageExample, 'send_message 示例')">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>

        <div class="mt-4 grid gap-2 text-sm text-subtle">
          <div v-for="field in sendMessageFields" :key="field.name">
            <code class="mono">{{ field.name }}</code>：{{ field.description }}
          </div>
        </div>

        <div class="code-surface mt-4 px-4 py-4">
          <pre class="text-sm leading-7 whitespace-pre-wrap break-all [overflow-wrap:anywhere] mono">{{ sendMessageExample }}</pre>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { showToast } from '~/composables/useToast';
import AppIcon from '~/shared/icons/AppIcon.vue';
import PageContextBar from '~/shared/ui/PageContextBar.vue';

const protocolVersion = '2025-11-25';
const baseUrlPlaceholder = '<BASE_URL>';
const adminTokenEnv = 'EDGEONE_MCP_ADMIN_TOKEN';

const workflowSteps = [
  {
    title: '先确认 baseUrl',
    description: '把当前项目地址当成 baseUrl。页面上方会直接显示当前站点地址，部署到你自己的域名后这里也会跟着变化。',
  },
  {
    title: '客户端配置 /mcp',
    description: '在 Claude Code、Cursor、Codex、OpenCode 里，把远程 MCP 地址配成 baseUrl + /mcp。',
  },
  {
    title: '决定匿名还是管理员模式',
    description: '如果只发消息且你已经知道 appKey，用匿名 send_message；如果要让 Agent 查 appKey、看消息和统计，就加 Bearer AT_...。',
  },
  {
    title: '用 appKey 发送',
    description: 'appKey 来自应用页或现有 send URL。sendType=page 时必须补 body。',
  },
];

const toolMatrix = [
  {
    name: 'send_message',
    access: 'anonymous',
    badgeClass: 'badge-emerald',
    mode: 'write',
    description: '向指定 app 发送消息。只要已知 appKey，就不要求 Bearer Token。',
  },
  {
    name: 'apps_list',
    access: 'Bearer AT_...',
    badgeClass: 'badge-amber',
    mode: 'read',
    description: '列出 app 与 appKey。这个工具会暴露应用目录，因此必须带管理员 Bearer Token。',
  },
  {
    name: 'apps_get',
    access: 'Bearer AT_...',
    badgeClass: 'badge-amber',
    mode: 'read',
    description: '读取单个 app 的发送能力、支持字段和最小示例。',
  },
  {
    name: 'messages_list',
    access: 'Bearer AT_...',
    badgeClass: 'badge-amber',
    mode: 'read',
    description: '读取消息列表与分页信息，用于排查投递情况。',
  },
  {
    name: 'messages_get',
    access: 'Bearer AT_...',
    badgeClass: 'badge-amber',
    mode: 'read',
    description: '读取单条消息详情，包括投递结果和详情页信息。',
  },
  {
    name: 'stats_get',
    access: 'Bearer AT_...',
    badgeClass: 'badge-amber',
    mode: 'read',
    description: '读取系统概览统计，如应用数、消息数和接收者数量。',
  },
  {
    name: 'setup_overview_get',
    access: 'Bearer AT_...',
    badgeClass: 'badge-amber',
    mode: 'read',
    description: '读取初始化状态、索引健康和上手概览。',
  },
];

const sendMessageFields = [
  { name: 'appKey', description: '从「应用」页复制，或取现有 /send/{appKey} 的最后一段。' },
  { name: 'title', description: '消息标题，必填。' },
  { name: 'body', description: '消息正文；sendType=page 时必填。' },
  { name: 'sendType', description: 'text 或 page。' },
  { name: 'format', description: '正文格式，可选 text / markdown / html。' },
  { name: 'linkUrl', description: '可选跳转链接。' },
  { name: 'summary', description: '可选摘要覆盖。' },
  { name: 'templateKey', description: '可选模板预设 key。' },
];

const siteOrigin = computed(() => (
  import.meta.client ? window.location.origin.replace(/\/+$/, '') : ''
));

const currentBaseUrl = computed(() => siteOrigin.value || 'https://your-domain.com');
const currentMcpEndpoint = computed(() => `${currentBaseUrl.value}/mcp`);
const mcpEndpointTemplate = computed(() => `${baseUrlPlaceholder}/mcp`);
const shellAdminTokenRef = `$${adminTokenEnv}`;
const cursorEnvPlaceholder = '${env:' + adminTokenEnv + '}';
const openCodeEnvPlaceholder = '{env:' + adminTokenEnv + '}';

const workflowText = computed(() => [
  'Workflow:',
  `1. Set baseUrl to the current project address, then set MCP URL to ${baseUrlPlaceholder}/mcp.`,
  '2. If you already know appKey, call send_message directly. No bearer token is required.',
  `3. If you need app discovery or admin read tools, add Authorization: Bearer <AT_...> and reconnect.`,
  '4. Copy appKey from the admin Apps page or from the existing /send/{appKey} URL.',
  'If sendType is "page", body is required.',
].join('\n'));

const requiredHeadersText = computed(() => [
  `MCP-Protocol-Version: ${protocolVersion}`,
  'Authorization: Bearer <AT_...>   # apps_list / apps_get / messages_* / stats_get / setup_overview_get',
  '',
  '# send_message with a known appKey does not require Authorization',
].join('\n'));

const sendMessageExample = computed(() => JSON.stringify({
  appKey: 'APKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  title: 'Server Alert',
  body: 'CPU usage exceeded 80%',
  sendType: 'text',
}, null, 2));

const clientConfigs = computed(() => [
  {
    name: 'Claude Code',
    location: 'CLI command',
    description: '适合本地终端接入远程 MCP。命令里先定义 BASE_URL，再决定是否补管理员 Token。',
    note: '推荐先用 send-only 验证连通性；如果希望 Claude 自己调用 apps_list 或查看消息历史，再切到 admin read 版本。',
    snippets: [
      {
        label: 'Send-only',
        description: '仅暴露 send_message，适合已知 appKey 的匿名发送。',
        code: [
          `export BASE_URL="${baseUrlPlaceholder}"`,
          'claude mcp add --transport http edgeone-mcp-pusher "$BASE_URL/mcp"',
        ].join('\n'),
      },
      {
        label: 'Admin Read',
        description: '允许 apps_list / apps_get / messages_* / stats_get / setup_overview_get。',
        code: [
          `export BASE_URL="${baseUrlPlaceholder}"`,
          `export ${adminTokenEnv}="AT_xxx"`,
          'claude mcp add --transport http edgeone-mcp-pusher-admin "$BASE_URL/mcp" \\',
          `  --header "Authorization: Bearer ${shellAdminTokenRef}"`,
        ].join('\n'),
      },
    ],
  },
  {
    name: 'Codex',
    location: 'codex mcp add',
    description: 'Codex CLI 直接支持远程 Streamable HTTP MCP，并且可以把 Bearer Token 放进环境变量。',
    note: 'Codex 管理员模式推荐使用环境变量，不要把 AT_... 直接写死在共享脚本里。',
    snippets: [
      {
        label: 'Send-only',
        description: '只接 send_message，适合你已经知道 appKey 的场景。',
        code: [
          `export BASE_URL="${baseUrlPlaceholder}"`,
          'codex mcp add edgeone-mcp-pusher --url "$BASE_URL/mcp"',
        ].join('\n'),
      },
      {
        label: 'Admin Read',
        description: '把管理员 Bearer Token 挂到远程 MCP 配置里。',
        code: [
          `export BASE_URL="${baseUrlPlaceholder}"`,
          `export ${adminTokenEnv}="AT_xxx"`,
          'codex mcp add edgeone-mcp-pusher-admin \\',
          '  --url "$BASE_URL/mcp" \\',
          `  --bearer-token-env-var ${adminTokenEnv}`,
        ].join('\n'),
      },
    ],
  },
  {
    name: 'Cursor',
    location: '~/.cursor/mcp.json',
    description: 'Cursor 走 JSON 配置。匿名发送时只配 URL；管理员模式在 headers 里补 Authorization。',
    note: '如果你只想让 Cursor 负责发送，删除 headers 即可；要让 Agent 自己发现 app 或读后台工具时再加 Bearer。',
    snippets: [
      {
        label: 'Send-only',
        description: '匿名模式，只看到 send_message。',
        code: `{
  "mcpServers": {
    "edgeone-mcp-pusher": {
      "url": "${baseUrlPlaceholder}/mcp"
    }
  }
}`,
      },
      {
        label: 'Admin Read',
        description: '管理员模式，允许列 app、看消息和读统计。',
        code: [
          '{',
          '  "mcpServers": {',
          '    "edgeone-mcp-pusher-admin": {',
          `      "url": "${baseUrlPlaceholder}/mcp",`,
          '      "headers": {',
          `        "Authorization": "Bearer ${cursorEnvPlaceholder}"`,
          '      }',
          '    }',
          '  }',
          '}',
        ].join('\n'),
      },
    ],
  },
  {
    name: 'OpenCode',
    location: 'opencode.json',
    description: 'OpenCode 用 remote MCP 配置，管理员模式同样在 headers 里补 Bearer Token。',
    note: 'OpenCode 的环境变量写法和 Cursor 不同，使用 {env:VAR} 形式。',
    snippets: [
      {
        label: 'Send-only',
        description: '匿名发送模式，不包含 Authorization。',
        code: `{
  "mcp": {
    "edgeone-mcp-pusher": {
      "type": "remote",
      "url": "${baseUrlPlaceholder}/mcp",
      "enabled": true
    }
  }
}`,
      },
      {
        label: 'Admin Read',
        description: '管理员模式，解锁 apps_list / apps_get / 后台只读工具。',
        code: `{
  "mcp": {
    "edgeone-mcp-pusher-admin": {
      "type": "remote",
      "url": "${baseUrlPlaceholder}/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer ${openCodeEnvPlaceholder}"
      }
    }
  }
}`,
      },
    ],
  },
]);

const statusItems = computed(() => ([
  { label: 'send 匿名可用', tone: 'cyan' as const },
  { label: '其余工具需 AT_', tone: 'amber' as const },
  { label: 'baseUrl = 当前项目地址', tone: 'neutral' as const },
]));

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  showToast(`${label}已复制`, 'success');
}
</script>
