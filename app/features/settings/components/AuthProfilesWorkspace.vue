<template>
  <div class="space-y-5">
    <PageContextBar
      title="设置"
      subtitle="集中维护微信公众号和企业微信的可复用认证配置。Webhook 类应用不会出现在这里。"
      :tabs="settingsTabs"
    >
      <template #actions>
        <button class="button-secondary" type="button" :disabled="workspace.loading" @click="workspace.loadProfiles">
          <AppIcon name="refresh" :size="16" :class="workspace.loading ? 'animate-spin' : ''" />
          <span>刷新</span>
        </button>
        <button class="button-primary" type="button" @click="workspace.openCreate">
          <AppIcon name="plus" :size="16" />
          <span>新建认证配置</span>
        </button>
      </template>
    </PageContextBar>

    <div v-if="workspace.profiles.length === 0 && !workspace.loading" class="surface-panel-strong p-10 text-center">
      <div class="empty-state-icon mx-auto flex size-14 items-center justify-center rounded-[1.2rem]">
        <AppIcon name="key" :size="22" />
      </div>
      <h2 class="text-app mt-5 text-xl font-semibold tracking-[-0.02em]">还没有认证配置</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-7 text-subtle">
        当你准备创建微信公众号或企业微信应用时，再在这里保存一份可复用凭证即可。
      </p>
    </div>

    <AuthProfilesGrid
      v-else
      :profiles="workspace.profiles"
      @detail="workspace.openDetail"
      @edit="workspace.openEdit"
    />

    <AuthProfileEditorSheet
      :open="workspace.sheetOpen"
      :editing-id="workspace.editingId"
      :saving="workspace.saving"
      :form="workspace.form"
      @close="workspace.closeSheet"
      @submit="workspace.submitForm"
    />

    <AuthProfileDetailSheet
      :open="workspace.detailSheetOpen"
      :auth-profile-id="workspace.detailProfileId"
      editable
      @close="workspace.closeDetail"
      @edit="workspace.openEditFromDetail"
      @navigate-app="workspace.navigateToApp"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, proxyRefs } from 'vue';
import { settingsTabs } from '../constants';
import { useAuthProfilesWorkspace } from '../composables/useAuthProfilesWorkspace';
import AuthProfileDetailSheet from './AuthProfileDetailSheet.vue';
import AuthProfileEditorSheet from './AuthProfileEditorSheet.vue';
import AuthProfilesGrid from './AuthProfilesGrid.vue';
import AppIcon from '~/shared/icons/AppIcon.vue';
import PageContextBar from '~/shared/ui/PageContextBar.vue';

const workspace = proxyRefs(useAuthProfilesWorkspace());

onMounted(workspace.loadProfiles);
</script>
