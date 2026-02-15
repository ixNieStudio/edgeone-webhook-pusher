<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto">
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl w-full max-w-md">
        
        <!-- 步骤 1: 选择重置方式 -->
        <div v-if="step === 'confirm'">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">
              重置登录密钥
            </h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleClose"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          
          <div class="p-4 space-y-4">
            <!-- 警告提示 -->
            <div class="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Icon icon="heroicons:exclamation-triangle" class="text-yellow-500 text-xl shrink-0 mt-0.5" />
              <div class="text-sm text-yellow-700 dark:text-yellow-400">
                <div class="font-medium mb-1">重要提示</div>
                <ul class="text-xs space-y-1 list-disc list-inside">
                  <li>重置后，旧的登录密钥将立即失效</li>
                  <li>您需要使用新密钥重新登录</li>
                  <li>请务必保存新密钥，否则将无法登录系统</li>
                </ul>
              </div>
            </div>
            
            <!-- 重置方式选择 -->
            <div class="space-y-3">
              <label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/20': !useCustomPassword }">
                <input
                  type="radio"
                  :value="false"
                  v-model="useCustomPassword"
                  class="mt-1"
                />
                <div class="flex-1">
                  <div class="font-medium text-sm text-gray-800 dark:text-gray-200">
                    自动生成密钥
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    系统将生成一个安全的随机密钥
                  </div>
                </div>
              </label>
              
              <label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/20': useCustomPassword }">
                <input
                  type="radio"
                  :value="true"
                  v-model="useCustomPassword"
                  class="mt-1"
                />
                <div class="flex-1">
                  <div class="font-medium text-sm text-gray-800 dark:text-gray-200">
                    自定义密码
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    设置一个易于记忆但符合安全要求的密码
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="handleClose"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              @click="handleNext"
            >
              下一步
            </button>
          </div>
        </div>
        
        <!-- 步骤 2: 自定义密码输入 -->
        <div v-else-if="step === 'custom'">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">
              设置自定义密码
            </h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleClose"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          
          <div class="p-4 space-y-4">
            <!-- 新密码输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                新密码
              </label>
              <div class="relative">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="newPassword"
                  class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="请输入新密码"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @click="showPassword = !showPassword"
                >
                  <Icon :icon="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="text-lg" />
                </button>
              </div>
            </div>
            
            <!-- 确认密码输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                确认密码
              </label>
              <div class="relative">
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  v-model="confirmPassword"
                  class="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  :class="{ 'border-red-500 dark:border-red-500': confirmPassword && !passwordsMatch, 'border-gray-300 dark:border-gray-600': !confirmPassword || passwordsMatch }"
                  placeholder="请再次输入密码"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <Icon :icon="showConfirmPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="text-lg" />
                </button>
              </div>
              <p v-if="confirmPassword && !passwordsMatch" class="text-xs text-red-500 mt-1">
                两次输入的密码不一致
              </p>
            </div>
            
            <!-- 密码强度指示器 -->
            <div v-if="newPassword" class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">密码强度</span>
                <span
                  class="font-medium"
                  :class="{
                    'text-red-500': passwordStrength === 'weak',
                    'text-yellow-500': passwordStrength === 'medium',
                    'text-green-500': passwordStrength === 'strong',
                  }"
                >
                  {{ passwordStrength === 'weak' ? '弱' : passwordStrength === 'medium' ? '中等' : '强' }}
                </span>
              </div>
              <div class="flex gap-1">
                <div
                  class="h-1 flex-1 rounded transition-colors"
                  :class="{
                    'bg-red-500': passwordStrength === 'weak',
                    'bg-yellow-500': passwordStrength === 'medium',
                    'bg-green-500': passwordStrength === 'strong',
                  }"
                ></div>
                <div
                  class="h-1 flex-1 rounded transition-colors"
                  :class="{
                    'bg-gray-200 dark:bg-gray-700': passwordStrength === 'weak',
                    'bg-yellow-500': passwordStrength === 'medium',
                    'bg-green-500': passwordStrength === 'strong',
                  }"
                ></div>
                <div
                  class="h-1 flex-1 rounded transition-colors"
                  :class="{
                    'bg-gray-200 dark:bg-gray-700': passwordStrength !== 'strong',
                    'bg-green-500': passwordStrength === 'strong',
                  }"
                ></div>
              </div>
            </div>
            
            <!-- 密码复杂度要求清单 -->
            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码必须满足以下要求：
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs">
                  <Icon
                    :icon="complexityChecks.length ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                    :class="complexityChecks.length ? 'text-green-500' : 'text-gray-400'"
                  />
                  <span :class="complexityChecks.length ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'">
                    至少 12 个字符
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <Icon
                    :icon="complexityChecks.uppercase ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                    :class="complexityChecks.uppercase ? 'text-green-500' : 'text-gray-400'"
                  />
                  <span :class="complexityChecks.uppercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'">
                    包含大写字母 (A-Z)
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <Icon
                    :icon="complexityChecks.lowercase ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                    :class="complexityChecks.lowercase ? 'text-green-500' : 'text-gray-400'"
                  />
                  <span :class="complexityChecks.lowercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'">
                    包含小写字母 (a-z)
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <Icon
                    :icon="complexityChecks.number ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                    :class="complexityChecks.number ? 'text-green-500' : 'text-gray-400'"
                  />
                  <span :class="complexityChecks.number ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'">
                    包含数字 (0-9)
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <Icon
                    :icon="complexityChecks.special ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                    :class="complexityChecks.special ? 'text-green-500' : 'text-gray-400'"
                  />
                  <span :class="complexityChecks.special ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'">
                    包含特殊字符 (!@#$%^&* 等)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="step = 'confirm'"
            >
              上一步
            </button>
            <button
              :disabled="!canSubmit || resetting"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="handleReset"
            >
              <Icon v-if="resetting" icon="heroicons:arrow-path" class="text-base animate-spin" />
              确认重置
            </button>
          </div>
        </div>
        
        <!-- 步骤 3: 重置成功 -->
        <div v-else-if="step === 'result'">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">重置成功</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleClose"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="p-4">
            <div class="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
              <Icon icon="heroicons:check-circle" class="text-green-500 text-xl shrink-0 mt-0.5" />
              <div class="text-sm text-green-700 dark:text-green-400">
                <div class="font-medium mb-1">密钥已重置</div>
                <div class="text-xs">请立即复制并保存新密钥。旧密钥已失效。</div>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新登录密钥</label>
                <div class="flex items-center gap-2">
                  <code class="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded overflow-x-auto break-all">{{ newToken }}</code>
                  <button
                    class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
                    @click="handleCopy"
                  >
                    <Icon icon="heroicons:clipboard" class="text-base" />
                  </button>
                </div>
              </div>

              <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div class="flex items-start gap-2">
                  <Icon icon="heroicons:exclamation-circle" class="text-red-500 text-lg shrink-0 mt-0.5" />
                  <div class="text-xs text-red-700 dark:text-red-400">
                    <div class="font-medium mb-1">请务必保存此密钥</div>
                    <div>关闭此对话框后将无法再次查看。如果丢失，您将无法登录系统。</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              @click="handleClose"
            >
              <Icon icon="heroicons:check" class="text-base" />
              我已保存
            </button>
          </div>
        </div>
        
        <!-- 步骤 4: 重置失败 -->
        <div v-else-if="step === 'error'">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">重置失败</h3>
            <button
              type="button"
              class="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="handleClose"
            >
              <Icon icon="heroicons:x-mark" class="text-xl" />
            </button>
          </div>
          <div class="p-4">
            <div class="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
              <Icon icon="heroicons:x-circle" class="text-red-500 text-xl shrink-0 mt-0.5" />
              <div class="text-sm text-red-700 dark:text-red-400">
                <div class="font-medium mb-1">操作失败</div>
                <div class="text-xs">{{ errorMessage }}</div>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 py-3 px-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="handleClose"
            >
              关闭
            </button>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              @click="handleRetry"
            >
              重试
            </button>
          </div>
        </div>
        
      </div>
      <div class="fixed inset-0 bg-black/50 -z-10" @click="handleClose"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { checkPasswordComplexity, calculatePasswordStrength } from '~/utils/password-validation';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  success: [token: string];
}>();

const api = useApi();
const toast = useToast();

// 模态框步骤
type ModalStep = 'confirm' | 'custom' | 'result' | 'error';

// 组件状态
const step = ref<ModalStep>('confirm');
const useCustomPassword = ref(false);
const newPassword = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const resetting = ref(false);
const newToken = ref('');
const errorMessage = ref('');

// 密码复杂度状态
const passwordStrength = computed(() => {
  if (!newPassword.value) return 'weak';
  return calculatePasswordStrength(newPassword.value);
});

const complexityChecks = computed(() => {
  return checkPasswordComplexity(newPassword.value);
});

const isPasswordValid = computed(() => {
  return Object.values(complexityChecks.value).every(check => check);
});

const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true;
  return newPassword.value === confirmPassword.value;
});

const canSubmit = computed(() => {
  if (!useCustomPassword.value) return true;
  return isPasswordValid.value && passwordsMatch.value && confirmPassword.value !== '';
});

// 监听 show 属性变化，重置状态
watch(() => props.show, (show) => {
  if (show) {
    // Reset state when modal opens
    step.value = 'confirm';
    useCustomPassword.value = false;
    newPassword.value = '';
    confirmPassword.value = '';
    showPassword.value = false;
    showConfirmPassword.value = false;
    resetting.value = false;
    newToken.value = '';
    errorMessage.value = '';
  }
});

function handleNext() {
  if (useCustomPassword.value) {
    step.value = 'custom';
  } else {
    handleReset();
  }
}

async function handleReset() {
  resetting.value = true;
  errorMessage.value = '';

  try {
    const response = await api.resetAdminToken(
      useCustomPassword.value ? newPassword.value : undefined,
      useCustomPassword.value ? confirmPassword.value : undefined
    );
    
    if (response.data) {
      newToken.value = response.data.adminToken;
      step.value = 'result';
      emit('success', response.data.adminToken);
    }
  } catch (e: unknown) {
    const err = e as Error;
    errorMessage.value = err.message || '重置失败，请稍后重试';
    step.value = 'error';
  } finally {
    resetting.value = false;
  }
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(newToken.value);
    toast.add({ title: '密钥已复制', color: 'success' });
  } catch {
    toast.add({ title: '复制失败，请手动复制', color: 'error' });
  }
}

function handleClose() {
  // 清理所有状态和敏感数据
  step.value = 'confirm';
  useCustomPassword.value = false;
  newPassword.value = '';
  confirmPassword.value = '';
  showPassword.value = false;
  showConfirmPassword.value = false;
  resetting.value = false;
  newToken.value = '';
  errorMessage.value = '';
  
  emit('close');
}

function handleRetry() {
  step.value = 'confirm';
  errorMessage.value = '';
}
</script>
