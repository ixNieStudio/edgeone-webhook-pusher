export interface HealthResponse {
  success: boolean;
  healthy: boolean;
  ready: boolean;
  timestamp?: string;
  summary: {
    healthy: boolean;
    ready: boolean;
    errorCount: number;
    warningCount: number;
    errors: string[];
    warnings: string[];
  };
  env: {
    BUILD_KEY: HealthEnvCheck;
    KV_BASE_URL: HealthEnvCheck;
  };
  kv: {
    bindings: Record<string, HealthKvBinding>;
    systemConfig?: {
      initialized: boolean;
      error?: string;
    };
  };
}

export interface MigrationHealthResponse {
  success: boolean;
  timestamp?: string;
  legacy: {
    hasData: boolean;
    namespaces: Record<string, { configured: boolean; hasData: boolean; error?: string }>;
  };
}

export interface HealthEnvCheck {
  required: boolean;
  present: boolean;
  ok: boolean;
  length?: number;
  value?: string | null;
}

export interface HealthKvBinding {
  ok: boolean;
  configured: boolean;
  readable: boolean;
  methods: {
    get: boolean;
    put: boolean;
    delete: boolean;
    list: boolean;
  };
  error?: string;
}

export type HealthTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface HealthDisplayItem {
  key: string;
  label: string;
  tone: HealthTone;
  statusText: string;
  description: string;
  code?: string;
}

export interface HealthGuideItem {
  key: string;
  title: string;
  tone: HealthTone;
  description: string;
  code?: string;
}
