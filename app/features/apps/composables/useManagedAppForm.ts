import { reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type {
  AppDeliveryConfig,
  AuthProfileSummary,
  CreateManagedAppInput,
  JumpBehavior,
  ManagedAppLiteDetail,
  PushContentFormat,
  TemplateProfile,
  TemplateFieldSource,
  UpdateManagedAppInput,
} from '~/types';
import { useAppApi } from '~/composables/api/useAppApi';
import { useAuthProfileApi } from '~/composables/api/useAuthProfileApi';
import { showToast } from '~/composables/useToast';
import type { AppsCapabilityMap, FieldMapItem, ManagedAppFormState, SheetMode, TemplateProfileFormItem } from '../types';
import { isWebhookType } from '../utils';

interface UseManagedAppFormOptions {
  authProfiles: Ref<AuthProfileSummary[]>;
  capabilities: Ref<AppsCapabilityMap | null>;
}

function createFieldMapItem(source: TemplateFieldSource = 'title', key = '', value = ''): FieldMapItem {
  return {
    id: `${Date.now()}-${Math.random()}`,
    key,
    source,
    value,
  };
}

export function useManagedAppForm(options: UseManagedAppFormOptions) {
  const appApi = useAppApi();
  const authProfileApi = useAuthProfileApi();
  const saving = ref(false);
  const preparing = ref(false);
  let syncingForm = false;

  const form = reactive<ManagedAppFormState>({
    name: '',
    deliveryType: 'dingtalk',
    webhookUrl: '',
    webhookSecret: '',
    authMode: 'existing',
    authProfileId: '',
    draft: {
      name: '',
      wechat: {
        appId: '',
        appSecret: '',
      },
      workWechat: {
        corpId: '',
        agentId: 0,
        corpSecret: '',
      },
    },
    renderer: 'text',
    defaultSendType: 'text',
    contentFormatDefault: 'text',
    jumpBehavior: 'direct_first',
    templateId: '',
    fallbackToText: true,
    fieldMap: [],
    templateProfiles: [],
    userIdsText: '',
    departmentIdsText: '',
  });

  function renderersForType(type: ManagedAppFormState['deliveryType']) {
    return options.capabilities.value?.[type]?.renderers || ['text'];
  }

  function sendTypesForType(type: ManagedAppFormState['deliveryType']) {
    return options.capabilities.value?.[type]?.sendTypes || ['text', 'page'];
  }

  function isSimplifiedDeliveryType(type: ManagedAppFormState['deliveryType']) {
    return type === 'wechat' || type === 'work_wechat';
  }

  function inferDefaultSendType(app: ManagedAppLiteDetail): ManagedAppFormState['defaultSendType'] {
    if (app.messageProfile.defaultSendType === 'text' || app.messageProfile.defaultSendType === 'page') {
      return app.messageProfile.defaultSendType;
    }

    return (
      app.messageProfile.renderer === 'template'
      || app.messageProfile.renderer === 'template_card'
      || Boolean(app.messageProfile.templateId)
      || Boolean(app.messageProfile.templateProfiles?.length)
      || app.messageProfile.jumpBehavior === 'landing_only'
      || (app.messageProfile.contentFormatDefault && app.messageProfile.contentFormatDefault !== 'text')
    ) ? 'page' : 'text';
  }

  function contentFormatsForType(type: ManagedAppFormState['deliveryType']) {
    return options.capabilities.value?.[type]?.contentFormats || ['text'];
  }

  function jumpBehaviorsForType(type: ManagedAppFormState['deliveryType']) {
    return options.capabilities.value?.[type]?.jumpBehaviors || ['direct_first', 'landing_only', 'none'];
  }

  function resetForm() {
    syncingForm = true;
    form.name = '';
    form.deliveryType = 'dingtalk';
    form.webhookUrl = '';
    form.webhookSecret = '';
    form.authMode = 'existing';
    form.authProfileId = '';
    form.draft.name = '';
    form.draft.wechat.appId = '';
    form.draft.wechat.appSecret = '';
    form.draft.workWechat.corpId = '';
    form.draft.workWechat.agentId = 0;
    form.draft.workWechat.corpSecret = '';
    form.renderer = 'text';
    form.defaultSendType = 'text';
    form.contentFormatDefault = 'text';
    form.jumpBehavior = 'direct_first';
    form.templateId = '';
    form.fallbackToText = true;
    form.fieldMap = [];
    form.templateProfiles = [];
    form.userIdsText = '';
    form.departmentIdsText = '';
    syncingForm = false;
  }

  function removeFieldMapItem(id: string) {
    form.fieldMap = form.fieldMap.filter((item) => item.id !== id);
  }

  function createTemplateProfileItem(profile?: Partial<TemplateProfile>): TemplateProfileFormItem {
    return {
      id: `${Date.now()}-${Math.random()}`,
      key: profile?.key || '',
      name: profile?.name || '',
      templateId: profile?.templateId || '',
      jumpBehavior: profile?.jumpBehavior || form.jumpBehavior,
      summaryMode: profile?.summaryMode || 'auto',
      enabled: profile?.enabled ?? true,
      isDefault: profile?.isDefault ?? form.templateProfiles.length === 0,
      fieldMap: Object.entries(profile?.fieldMap || {}).map(([fieldKey, mapping]) =>
        createFieldMapItem(mapping.source, fieldKey, mapping.value || '')
      ),
    };
  }

  function ensureDefaultTemplateProfile() {
    if (!form.templateProfiles.length) return;
    if (!form.templateProfiles.some((item) => item.isDefault)) {
      form.templateProfiles[0].isDefault = true;
    }
  }

  function setDefaultTemplateProfile(id: string) {
    form.templateProfiles = form.templateProfiles.map((profile) => ({
      ...profile,
      isDefault: profile.id === id,
    }));
  }

  function addTemplateProfile() {
    form.templateProfiles.push(createTemplateProfileItem({
      key: `profile_${form.templateProfiles.length + 1}`,
      name: `模板预设 ${form.templateProfiles.length + 1}`,
      jumpBehavior: form.jumpBehavior,
      summaryMode: 'auto',
      enabled: true,
      isDefault: form.templateProfiles.length === 0,
      fieldMap: {
        first: { source: 'title' },
        keyword1: { source: 'summary' },
        remark: { source: 'detail_page_url' },
      },
    }));
    ensureDefaultTemplateProfile();
  }

  function removeTemplateProfile(id: string) {
    form.templateProfiles = form.templateProfiles.filter((profile) => profile.id !== id);
    ensureDefaultTemplateProfile();
  }

  function addTemplateFieldMapItem(profileId: string) {
    const profile = form.templateProfiles.find((item) => item.id === profileId);
    if (!profile) return;
    profile.fieldMap.push(createFieldMapItem());
  }

  function removeTemplateFieldMapItem(profileId: string, fieldMapId: string) {
    const profile = form.templateProfiles.find((item) => item.id === profileId);
    if (!profile) return;
    profile.fieldMap = profile.fieldMap.filter((item) => item.id !== fieldMapId);
  }

  function buildFieldMapItems(items: FieldMapItem[]) {
    return Object.fromEntries(
      items
        .filter((item) => item.key.trim())
        .map((item) => [
          item.key.trim(),
          {
            source: item.source,
            ...(item.value ? { value: item.value } : {}),
          },
        ])
    );
  }

  function buildTemplateProfiles(): TemplateProfile[] {
    ensureDefaultTemplateProfile();
    return form.templateProfiles
      .filter((profile) => profile.key.trim() && profile.templateId.trim())
      .map((profile) => ({
        key: profile.key.trim(),
        name: profile.name.trim() || profile.key.trim(),
        templateId: profile.templateId.trim(),
        jumpBehavior: profile.jumpBehavior,
        summaryMode: profile.summaryMode,
        enabled: profile.enabled,
        isDefault: profile.isDefault,
        fieldMap: buildFieldMapItems(profile.fieldMap),
      }));
  }

  function fillFormFromApp(app: ManagedAppLiteDetail, config?: AppDeliveryConfig | null) {
    syncingForm = true;
    resetForm();
    form.name = app.name;
    form.deliveryType = app.deliveryType;
    form.renderer = app.messageProfile.renderer;
    form.defaultSendType = isSimplifiedDeliveryType(app.deliveryType)
      ? inferDefaultSendType(app)
      : 'text';
    form.contentFormatDefault = app.messageProfile.contentFormatDefault || 'text';
    form.jumpBehavior = app.messageProfile.jumpBehavior || 'direct_first';
    form.templateId = app.messageProfile.templateId || '';
    form.fallbackToText = app.messageProfile.fallbackToText ?? true;
    form.authProfileId = app.authProfileId || '';
    form.authMode = 'existing';
    form.webhookUrl = config?.inlineWebhook?.webhookUrl || '';
    form.webhookSecret = '';
    form.userIdsText = config?.recipientProfile.userIds?.join(', ') || app.recipientProfile.userIds?.join(', ') || '';
    form.departmentIdsText = config?.recipientProfile.departmentIds?.join(', ') || app.recipientProfile.departmentIds?.join(', ') || '';
    form.fieldMap = Object.entries(app.messageProfile.fieldMap || {}).map(([key, value]) => ({
      id: `${key}-${value.source}`,
      key,
      source: value.source,
      value: value.value || '',
    }));
    form.templateProfiles = (app.messageProfile.templateProfiles || []).map((profile) => createTemplateProfileItem(profile));
    if (!form.templateProfiles.length && app.messageProfile.renderer === 'template' && app.messageProfile.templateId) {
      form.templateProfiles = [
        createTemplateProfileItem({
          key: 'default',
          name: '默认模板',
          templateId: app.messageProfile.templateId,
          jumpBehavior: app.messageProfile.jumpBehavior || 'direct_first',
          summaryMode: 'auto',
          enabled: true,
          isDefault: true,
          fieldMap: app.messageProfile.fieldMap,
        }),
      ];
    }
    ensureDefaultTemplateProfile();
    syncingForm = false;
  }

  async function prepareCreate() {
    resetForm();
  }

  async function prepareEdit(app: ManagedAppLiteDetail) {
    preparing.value = true;
    try {
      const response = await appApi.getAppConfig(app.id);
      fillFormFromApp(app, response.data);
    } catch {
      fillFormFromApp(app, null);
    } finally {
      preparing.value = false;
    }
  }

  function parseList(input: string) {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseNumberList(input: string) {
    return input
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  async function submit(mode: SheetMode, selectedAppId: string) {
    saving.value = true;

    try {
      if (!form.name.trim()) throw new Error('请输入应用名称');

      let payload: CreateManagedAppInput | UpdateManagedAppInput;

      const templateProfiles = buildTemplateProfiles();
      const defaultTemplateProfile = templateProfiles.find((item) => item.isDefault) || templateProfiles[0];
      const messageProfile = isSimplifiedDeliveryType(form.deliveryType)
        ? {
            renderer: 'text' as const,
            defaultSendType: form.defaultSendType,
          }
        : {
            renderer: form.renderer,
            contentFormatDefault: form.contentFormatDefault,
            jumpBehavior: form.jumpBehavior,
            ...(defaultTemplateProfile?.templateId ? { templateId: defaultTemplateProfile.templateId } : form.templateId ? { templateId: form.templateId } : {}),
            ...(defaultTemplateProfile?.fieldMap ? { fieldMap: defaultTemplateProfile.fieldMap } : form.fieldMap.length ? { fieldMap: buildFieldMapItems(form.fieldMap) } : {}),
            ...(templateProfiles.length ? { templateProfiles } : {}),
            ...(form.renderer === 'template' ? { fallbackToText: form.fallbackToText } : {}),
          };

      const recipientProfile = form.deliveryType === 'work_wechat'
        ? {
            mode: 'fixed_targets' as const,
            userIds: parseList(form.userIdsText),
            departmentIds: parseNumberList(form.departmentIdsText),
          }
        : form.deliveryType === 'wechat'
          ? {
              mode: 'subscribe' as const,
            }
          : {
              mode: 'none' as const,
            };

      if (isWebhookType(form.deliveryType)) {
        if (!form.webhookUrl.trim()) throw new Error('请输入 Webhook URL');

        payload = {
          name: form.name.trim(),
          ...(mode === 'create' ? { deliveryType: form.deliveryType } : {}),
          connection: {
            mode: 'inline_webhook',
            webhookUrl: form.webhookUrl.trim(),
            ...(form.webhookSecret ? { secret: form.webhookSecret.trim() } : {}),
          },
          messageProfile,
          recipientProfile,
        } as CreateManagedAppInput;
      } else {
        let connection: CreateManagedAppInput['connection'] | UpdateManagedAppInput['connection'];

        if (form.authMode === 'existing') {
          if (!form.authProfileId) throw new Error('请选择认证配置');
          connection = {
            mode: 'auth_profile_ref',
            authProfileId: form.authProfileId,
          };
        } else if (mode === 'create') {
          connection = {
            mode: 'auth_profile_draft',
            authProfile: form.deliveryType === 'wechat'
              ? {
                  name: form.draft.name.trim() || `${form.name.trim()} 凭证`,
                  type: 'wechat',
                  config: {
                    appId: form.draft.wechat.appId.trim(),
                    appSecret: form.draft.wechat.appSecret.trim(),
                  },
                }
              : {
                  name: form.draft.name.trim() || `${form.name.trim()} 凭证`,
                  type: 'work_wechat',
                  config: {
                    corpId: form.draft.workWechat.corpId.trim(),
                    agentId: form.draft.workWechat.agentId,
                    corpSecret: form.draft.workWechat.corpSecret.trim(),
                  },
                },
          } as CreateManagedAppInput['connection'];
        } else {
          const createdProfile = await authProfileApi.createAuthProfile(
            form.deliveryType === 'wechat'
              ? {
                  name: form.draft.name.trim() || `${form.name.trim()} 凭证`,
                  type: 'wechat',
                  config: {
                    appId: form.draft.wechat.appId.trim(),
                    appSecret: form.draft.wechat.appSecret.trim(),
                  },
                }
              : {
                  name: form.draft.name.trim() || `${form.name.trim()} 凭证`,
                  type: 'work_wechat',
                  config: {
                    corpId: form.draft.workWechat.corpId.trim(),
                    agentId: form.draft.workWechat.agentId,
                    corpSecret: form.draft.workWechat.corpSecret.trim(),
                  },
                }
          );

          connection = {
            mode: 'auth_profile_ref',
            authProfileId: createdProfile.data.id,
          };
        }

        payload = {
          name: form.name.trim(),
          ...(mode === 'create' ? { deliveryType: form.deliveryType } : {}),
          connection,
          messageProfile,
          recipientProfile,
        } as CreateManagedAppInput;
      }

      if (mode === 'edit' && selectedAppId) {
        await appApi.updateApp(selectedAppId, payload as UpdateManagedAppInput);
        showToast('应用已更新', 'success');
        return selectedAppId;
      }

      const response = await appApi.createApp(payload as CreateManagedAppInput);
      showToast('应用已创建', 'success');
      return response.data.id;
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存应用失败', 'error');
      return '';
    } finally {
      saving.value = false;
    }
  }

  watch(() => form.deliveryType, (type) => {
    if (syncingForm) return;
    form.renderer = renderersForType(type)[0] || 'text';
    form.defaultSendType = sendTypesForType(type)[0] || 'text';
    form.contentFormatDefault = contentFormatsForType(type)[0] || 'text';
    form.jumpBehavior = jumpBehaviorsForType(type)[0] || 'direct_first';
    if (type !== 'wechat') {
      form.templateProfiles = [];
    }
    if (isSimplifiedDeliveryType(type)) {
      form.renderer = 'text';
      form.contentFormatDefault = 'text';
      form.jumpBehavior = 'direct_first';
      form.templateId = '';
      form.fieldMap = [];
      form.templateProfiles = [];
      form.fallbackToText = true;
    }
    if (isWebhookType(type)) {
      form.authMode = 'existing';
      form.authProfileId = '';
    }
  });

  watch(() => form.renderer, (renderer) => {
    if (syncingForm) return;
    if (renderer === 'template' && form.deliveryType === 'wechat' && !form.templateProfiles.length) {
      addTemplateProfile();
    }
    if (renderer !== 'template') {
      form.templateProfiles = [];
    }
  });

  return {
    addTemplateFieldMapItem,
    addTemplateProfile,
    contentFormatsForType,
    fieldMapFactory: createFieldMapItem,
    form,
    isWebhookType,
    jumpBehaviorsForType,
    preparing,
    prepareCreate,
    prepareEdit,
    removeFieldMapItem,
    removeTemplateFieldMapItem,
    removeTemplateProfile,
    renderersForType,
    sendTypesForType,
    saving,
    setDefaultTemplateProfile,
    submit,
  };
}
