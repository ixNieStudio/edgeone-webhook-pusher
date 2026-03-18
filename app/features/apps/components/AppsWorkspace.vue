<template>
  <div class="apps-workspace-shell">
    <div class="apps-workspace-header">
      <PageContextBar title="应用" :status-items="workspace.overviewStatusItems">
        <template #actions>
          <button class="button-secondary" type="button" :disabled="workspace.isRefreshing" @click="workspace.refreshAll(workspace.selectedAppId || undefined)">
            <AppIcon name="refresh" :size="16" :class="workspace.isRefreshing ? 'animate-spin' : ''" />
            <span>刷新</span>
          </button>
          <button class="button-primary" type="button" @click="workspace.openCreateSheet">
            <AppIcon name="plus" :size="16" />
            <span>创建应用</span>
          </button>
        </template>
      </PageContextBar>
    </div>

    <aside class="apps-workspace-list">
      <AppWorkspaceSidebar />
    </aside>

    <div class="apps-workspace-detail">
      <div class="apps-workspace-scroll space-y-5">
        <section class="surface-panel-strong p-5 sm:p-6">
          <template v-if="workspace.selectedApp">
            <ManagedAppHeader
              :app="workspace.selectedApp"
              :detail-loading="workspace.detailLoading"
              :auth-profile-maintenance-summary="workspace.authProfileMaintenanceSummary"
              @refresh="workspace.refreshAll(workspace.selectedAppId || undefined)"
              @edit="workspace.openEditSheet"
              @test="workspace.scrollToUsageTest"
              @delete="workspace.setConfirmDelete(true)"
              @open-auth-profile="workspace.openAuthProfileDetail"
            />

            <div class="mt-6 space-y-5">
              <AppUsageGuide :app="workspace.selectedApp" />

              <ManagedAppRecipientsSection
                :app="workspace.selectedApp"
                :recipients="workspace.recipients"
                :recipients-loading="workspace.recipientsLoading"
                :bind-state="workspace.bindStateView"
                :bind-loading="workspace.bindState.loading"
                @generate-bind="workspace.generateBindCode"
                @remove-recipient="workspace.removeRecipient"
              />
            </div>
          </template>

          <div v-else class="flex h-full min-h-[420px] items-center justify-center text-center">
            <div class="max-w-md">
              <div class="empty-state-icon mx-auto flex size-14 items-center justify-center rounded-[1.25rem]">
                <AppIcon name="apps" :size="22" />
              </div>
              <h2 class="text-app mt-5 text-xl font-semibold tracking-[-0.02em]">选择一个应用开始工作</h2>
              <p class="mt-2 text-sm leading-7 text-subtle">
                左侧目录负责快速切换应用，右侧画布会展示发送地址、接收者、认证维护和测试发送能力。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <ManagedAppEditorSheet
      :open="workspace.sheetMode === 'create' || workspace.sheetMode === 'edit'"
      :mode="workspace.sheetMode"
      :selected-app-id="workspace.selectedAppId"
      :selected-app="workspace.selectedApp"
      :auth-profiles="workspace.authProfiles"
      :capabilities="workspace.capabilities"
      @close="workspace.closeSheet"
      @saved="handleAppSaved"
    />

    <AppConfirmDialog
      :open="workspace.confirmDelete"
      title="删除应用"
      description="删除后 send key 将失效。历史消息记录仍会保留，但该应用将从控制台中移除。"
      confirm-label="删除应用"
      @close="workspace.setConfirmDelete(false)"
      @confirm="workspace.deleteSelectedApp"
    />

    <AuthProfileDetailSheet
      :open="Boolean(workspace.authProfileDetailId)"
      :auth-profile-id="workspace.authProfileDetailId"
      @close="workspace.closeAuthProfileDetail"
      @navigate-app="workspace.navigateToUsageApp"
    />
  </div>
</template>

<script setup lang="ts">
import { proxyRefs } from 'vue';
import { useManagedAppsWorkspace } from '../composables/useManagedAppsWorkspace';
import AppUsageGuide from './AppUsageGuide.vue';
import AppWorkspaceSidebar from './AppWorkspaceSidebar.vue';
import ManagedAppEditorSheet from './ManagedAppEditorSheet.vue';
import ManagedAppHeader from './ManagedAppHeader.vue';
import ManagedAppRecipientsSection from './ManagedAppRecipientsSection.vue';
import AuthProfileDetailSheet from '~/features/settings/components/AuthProfileDetailSheet.vue';
import AppIcon from '~/shared/icons/AppIcon.vue';
import AppConfirmDialog from '~/shared/ui/AppConfirmDialog.vue';
import PageContextBar from '~/shared/ui/PageContextBar.vue';

const workspace = proxyRefs(useManagedAppsWorkspace());

async function handleAppSaved(appId: string) {
  await workspace.closeSheet();
  await workspace.refreshAll(appId);
}
</script>
