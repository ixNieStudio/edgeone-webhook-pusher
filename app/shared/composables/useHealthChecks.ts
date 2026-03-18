import { computed, ref } from 'vue';
import type { HealthResponse, MigrationHealthResponse } from '~/types';

export function useHealthChecks() {
  const health = ref<HealthResponse | null>(null);
  const migration = ref<MigrationHealthResponse | null>(null);
  const loading = ref(false);
  const error = ref('');

  const envItems = computed(() => {
    if (!health.value) return [];
    return Object.entries(health.value.env).map(([key, value]) => ({
      key,
      label: key,
      ok: value.ok,
      description: value.ok
        ? '已配置'
        : value.required
          ? '缺少必需环境变量'
          : '未配置',
    }));
  });

  const kvItems = computed(() => {
    if (!health.value) return [];
    return Object.entries(health.value.kv.bindings).map(([key, value]) => ({
      key,
      label: key,
      ok: value.ok,
      description: value.ok
        ? '读写能力正常'
        : value.error || 'KV 绑定不可用',
    }));
  });

  const actionItems = computed(() => {
    if (!health.value) return [];

    const items: Array<{ key: string; title: string; description: string; tone: 'danger' | 'warning' | 'success' }> = [];

    if (!health.value.env.BUILD_KEY.ok) {
      items.push({
        key: 'build-key',
        title: '补全 BUILD_KEY',
        description: 'Node Functions 管理接口依赖 BUILD_KEY 校验，缺失会导致后台不可用。',
        tone: 'danger',
      });
    }

    if (!health.value.env.KV_BASE_URL.ok) {
      items.push({
        key: 'kv-base-url',
        title: '补全 KV_BASE_URL',
        description: 'Edge Functions KV 代理地址缺失时，控制台无法读取部署健康和 KV 状态。',
        tone: 'danger',
      });
    }

    if (!health.value.kv.bindings.PUSHER_KV?.ok) {
      items.push({
        key: 'pusher-kv',
        title: '修复 PUSHER_KV 绑定',
        description: health.value.kv.bindings.PUSHER_KV?.error || 'PUSHER_KV 当前无法正常访问。',
        tone: 'danger',
      });
    }

    if (!health.value.kv.systemConfig?.initialized) {
      items.push({
        key: 'init',
        title: '执行初始化',
        description: '系统配置尚未初始化，生成管理员令牌后才能进入控制台。',
        tone: 'warning',
      });
    }

    if (items.length === 0) {
      items.push({
        key: 'ready',
        title: '部署健康',
        description: '环境变量、KV 绑定和系统配置都已经就绪，可以直接开始创建应用。',
        tone: 'success',
      });
    }

    return items;
  });

  const hasBlockingIssues = computed(() => health.value?.healthy === false);

  async function refresh() {
    loading.value = true;
    error.value = '';

    try {
      const [healthRes, migrationRes] = await Promise.all([
        fetch('/api/health', {
          headers: { Accept: 'application/json' },
        }),
        fetch('/api/health-migration', {
          headers: { Accept: 'application/json' },
        }),
      ]);

      if (!healthRes.ok) {
        throw new Error('部署健康检查读取失败');
      }

      health.value = await healthRes.json() as HealthResponse;
      migration.value = migrationRes.ok ? await migrationRes.json() as MigrationHealthResponse : null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '部署健康检查失败';
      health.value = null;
      migration.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    health,
    migration,
    loading,
    error,
    envItems,
    kvItems,
    actionItems,
    hasBlockingIssues,
    refresh,
  };
}
