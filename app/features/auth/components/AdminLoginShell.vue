<template>
  <div class="min-h-[100dvh] px-4 py-4 sm:px-6 sm:py-6">
    <div class="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1440px] gap-5 xl:grid-cols-[minmax(0,1.1fr)_430px]">
      <section class="surface-panel-strong relative overflow-hidden p-6 sm:p-8">
        <button class="icon-button absolute right-6 top-6 z-10" type="button" @click="access.toggleTheme">
          <AppIcon :name="access.isDark ? 'sun' : 'moon'" :size="18" />
        </button>

        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.14),transparent_26%)] opacity-80" />

        <div class="relative flex h-full flex-col">
          <header>
            <div class="flex items-center gap-4">
              <div class="brand-badge-surface flex size-16 items-center justify-center rounded-[1.35rem] border border-[var(--app-border)] shadow-[var(--shadow-panel-soft)]">
                <img
                  src="/logo.png"
                  alt="EdgeOne MCP Pusher"
                  class="h-10 w-10 object-contain"
                  draggable="false"
                />
              </div>
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  EdgeOne MCP Notification Control Plane
                </div>
                <h1 class="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-app sm:text-[2.5rem]">
                  管理你的通知工作台
                </h1>
              </div>
            </div>

            <p class="mt-6 max-w-3xl text-base leading-8 text-app-muted">
              统一管理 webhook、MCP、公众号与企业微信消息能力，在同一个后台里完成应用创建、发送配置、接收者绑定与投递维护，面向 Agent、IDE 与自动化工作流。
            </p>

            <div class="mt-5 flex flex-wrap gap-2.5">
              <span class="badge-base badge-cyan">App-first Console</span>
              <span class="badge-base badge-neutral">Standard MCP Server</span>
              <span class="badge-base badge-neutral">Agent / IDE Ready</span>
              <span class="badge-base badge-neutral">Powered by EdgeOne Pages</span>
            </div>
          </header>

          <div class="mt-8 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <QuickStartPanel />

            <HealthSnapshotPanel
              :loading="access.healthLoading"
              :error="access.healthError"
              :summary-items="access.healthSummaryItems"
              :quick-items="access.quickHealthItems"
              :health-value-class="access.healthValueClass"
              :quick-health-item-class="access.quickHealthItemClass"
              @refresh="access.refreshHealth"
            />
          </div>

          <footer class="relative mt-6 flex flex-col gap-2 border-t border-[var(--app-border)] pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
            <a
              href="https://edgeone.ai/?from=github"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-subtle"
            >
              <span>Powered by EdgeOne</span>
              <span class="brand-badge-surface inline-flex items-center rounded-md px-2 py-1">
                <img
                  src="/edgeone-logo.png"
                  alt="EdgeOne"
                  class="h-4 w-auto object-contain"
                  draggable="false"
                />
              </span>
            </a>
            <a
              href="https://github.com/ixNieStudio/edgeone-mcp-pusher"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-xs font-semibold text-subtle"
            >
              <AppIcon name="github" :size="14" />
              <span>github.com/ixNieStudio/edgeone-mcp-pusher</span>
            </a>
          </footer>
        </div>
      </section>

      <div class="flex items-stretch">
        <AdminAccessCard
          :checking-init="access.checkingInit"
          :initialized="access.initialized"
          :initializing="access.initializing"
          :generated-token="access.generatedToken"
          :has-blocking-issues="access.hasBlockingIssues"
          :token-input="access.tokenInput"
          :submitting="access.submitting"
          :login-error="access.loginError"
          :health-badge-class="access.healthBadgeClass"
          :health-badge-text="access.healthBadgeText"
          @initialize="access.handleInitialize"
          @copy-generated-token="access.copyGeneratedToken"
          @save-and-enter="access.saveAndEnter"
          @login="access.handleLogin"
          @update:token-input="access.tokenInput = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, proxyRefs } from 'vue';
import { useAdminAccess } from '../composables/useAdminAccess';
import AdminAccessCard from './AdminAccessCard.vue';
import HealthSnapshotPanel from './HealthSnapshotPanel.vue';
import QuickStartPanel from './QuickStartPanel.vue';
import AppIcon from '~/shared/icons/AppIcon.vue';

const access = proxyRefs(useAdminAccess());

onMounted(access.initializePage);
</script>
