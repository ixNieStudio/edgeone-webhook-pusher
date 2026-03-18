<template>
  <div class="messages-workspace-shell">
    <div class="messages-workspace-header">
      <PageContextBar title="消息" :status-items="workspace.statusItems">
        <template #actions>
          <button class="button-secondary" type="button" :disabled="workspace.refreshing" @click="workspace.refresh">
            <AppIcon name="refresh" :size="16" :class="workspace.refreshing ? 'animate-spin' : ''" />
            <span>刷新</span>
          </button>
        </template>
      </PageContextBar>
    </div>

    <MessagesInboxShell
      :apps="workspace.apps"
      :app-filter="workspace.appFilter"
      :date-preset="workspace.datePreset"
      :detail-loading="workspace.detailLoading"
      :direction-filter="workspace.directionFilter"
      :items="workspace.visibleItems"
      :loading="workspace.initialLoading"
      :message="workspace.selectedMessage"
      :pagination="workspace.pagination"
      :quick-filter="workspace.quickFilter"
      :refreshing="workspace.refreshing"
      :selected-id="workspace.selectedMessageId"
      :summary="workspace.selectedSummary"
      @page="workspace.goToPage"
      @refresh="workspace.refresh"
      @select="workspace.selectMessage"
      @update:app-filter="workspace.setAppFilter"
      @update:date-preset="workspace.setDatePreset"
      @update:direction-filter="workspace.setDirectionFilter"
      @update:quick-filter="workspace.setQuickFilter"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, proxyRefs } from 'vue';
import AppIcon from '~/shared/icons/AppIcon.vue';
import PageContextBar from '~/shared/ui/PageContextBar.vue';
import { useMessagesWorkspace } from '../composables/useMessagesWorkspace';
import MessagesInboxShell from './MessagesInboxShell.vue';

const workspace = proxyRefs(useMessagesWorkspace());

onMounted(() => {
  void workspace.loadMessages();
});
</script>
