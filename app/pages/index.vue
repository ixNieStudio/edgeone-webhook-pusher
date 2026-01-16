<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto">
    <div class="space-y-6">
      <!-- Welcome Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-[var(--text-primary)]">仪表盘</h1>
          <p class="text-sm text-[var(--text-secondary)] mt-1">欢迎使用 Webhook Pusher 消息推送服务</p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <NuxtLink to="/channels" class="group">
          <div class="card card-md card-hoverable h-full">
            <div class="flex items-start justify-between">
              <div class="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Icon icon="tabler:broadcast" class="text-xl text-white" />
              </div>
              <Icon icon="tabler:chevron-right" class="text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors" />
            </div>
            <div class="mt-3">
              <div class="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{{ stats.channels }}</div>
              <div class="text-xs text-[var(--text-secondary)] mt-0.5">渠道数量</div>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink to="/apps" class="group">
          <div class="card card-md card-hoverable h-full">
            <div class="flex items-start justify-between">
              <div class="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Icon icon="tabler:apps" class="text-xl text-white" />
              </div>
              <Icon icon="tabler:chevron-right" class="text-[var(--text-muted)] group-hover:text-blue-500 transition-colors" />
            </div>
            <div class="mt-3">
              <div class="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{{ stats.apps }}</div>
              <div class="text-xs text-[var(--text-secondary)] mt-0.5">应用数量</div>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink to="/messages" class="group">
          <div class="card card-md card-hoverable h-full">
            <div class="flex items-start justify-between">
              <div class="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                <Icon icon="tabler:message-2" class="text-xl text-white" />
              </div>
              <Icon icon="tabler:chevron-right" class="text-[var(--text-muted)] group-hover:text-amber-500 transition-colors" />
            </div>
            <div class="mt-3">
              <div class="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{{ stats.messages }}</div>
              <div class="text-xs text-[var(--text-secondary)] mt-0.5">消息总数</div>
            </div>
          </div>
        </NuxtLink>

        <div class="card card-md h-full">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center">
              <Icon icon="tabler:users-group" class="text-xl text-white" />
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{{ stats.openIds }}</div>
            <div class="text-xs text-[var(--text-secondary)] mt-0.5">订阅者数量</div>
          </div>
        </div>
      </div>

      <!-- Self-Hosting Guide -->
      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-[var(--border-default)]">
          <div class="flex items-center gap-2">
            <Icon icon="tabler:server" class="text-blue-500" />
            <span class="font-medium text-[var(--text-primary)]">自托管部署指南</span>
          </div>
        </div>
        <div class="p-4 md:p-5">
          <p class="text-sm text-[var(--text-secondary)] mb-5">
            本项目基于 EdgeOne Pages 构建，支持一键部署到你自己的 EdgeOne 账户。
          </p>
          
          <div class="space-y-5">
            <!-- Step 1 -->
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center">1</div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-[var(--text-primary)] mb-2">部署项目</h3>
                <p class="text-sm text-[var(--text-secondary)] mb-3">点击下方按钮，Fork 项目并部署到 EdgeOne Pages</p>
                <a 
                  href="https://edgeone.ai/pages/new?template=https://github.com/ixNieStudio/edgeone-webhook-pusher" 
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block"
                >
                  <img src="https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg" alt="Deploy to EdgeOne" class="h-10 hover:opacity-90 transition-opacity" />
                </a>
              </div>
            </div>

            <!-- Step 2: Build Config -->
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center">2</div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-[var(--text-primary)] mb-2">构建配置</h3>
                <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                        <th class="text-left py-2 px-3 font-medium text-[var(--text-secondary)]">配置项</th>
                        <th class="text-left py-2 px-3 font-medium text-[var(--text-secondary)]">值</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
                      <tr>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">Root directory</td>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">/</code></td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">Build output directory</td>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">dist</code></td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">Build command</td>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">yarn build</code></td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">Install command</td>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">yarn install</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Step 3: KV Config -->
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center">3</div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-[var(--text-primary)] mb-2">绑定 KV 命名空间</h3>
                <p class="text-sm text-[var(--text-secondary)] mb-3">在 EdgeOne 控制台「Pages」→「进入项目」→「KV 存储」→「绑定命名空间」中绑定以下命名空间：</p>
                <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                        <th class="text-left py-2 px-3 font-medium text-[var(--text-secondary)]">KV 绑定名称</th>
                        <th class="text-left py-2 px-3 font-medium text-[var(--text-secondary)]">用途说明</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
                      <tr>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">CONFIG_KV</code></td>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">系统配置存储</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">CHANNELS_KV</code></td>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">渠道数据存储</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">APPS_KV</code></td>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">应用数据存储</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">OPENIDS_KV</code></td>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">订阅者数据存储</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3"><code class="text-blue-600 dark:text-blue-400 font-mono">MESSAGES_KV</code></td>
                        <td class="py-2 px-3 text-[var(--text-secondary)]">消息历史存储</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Step 4 -->
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center">4</div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-[var(--text-primary)] mb-2">完成部署</h3>
                <p class="text-sm text-[var(--text-secondary)]">重新部署项目，访问应用完成初始化，系统会自动生成 Admin Token，请妥善保存</p>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <p class="text-xs text-[var(--text-muted)]">
              详细文档请查看 
              <a href="https://github.com/ixNieStudio/edgeone-webhook-pusher" target="_blank" class="text-blue-500 hover:underline">GitHub README</a>
            </p>
            <a 
              href="https://github.com/ixNieStudio/edgeone-webhook-pusher" 
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-xs btn-ghost-neutral"
            >
              <Icon icon="tabler:brand-github" /> 查看源码
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { StatsData } from '~/types';

definePageMeta({
  layout: 'default',
});

const api = useApi();

const stats = ref<StatsData>({
  channels: 0,
  apps: 0,
  openIds: 0,
  messages: 0,
});

onMounted(async () => {
  const res = await api.getStats();
  if (res.code === 0 && res.data) {
    stats.value = res.data;
  }
});
</script>
