import type { AuthProfileMaintenanceStatus } from '../types/app-config.js';

type RawTokenStatus = {
  valid: boolean;
  lastRefreshAt: number;
  lastRefreshSuccess: boolean;
  expiresAt?: number;
  error?: string;
  errorCode?: number;
} | null;

export function normalizeAuthProfileMaintenanceStatus(rawStatus: RawTokenStatus): AuthProfileMaintenanceStatus {
  if (!rawStatus) {
    return {
      status: 'unknown',
      valid: false,
      lastRefreshSuccess: false,
      supportsVerification: true,
    };
  }

  const isExpired = typeof rawStatus.expiresAt === 'number' && rawStatus.expiresAt <= Date.now();
  const hasRefreshed = rawStatus.lastRefreshAt > 0;
  let status: AuthProfileMaintenanceStatus['status'] = 'unknown';

  if (!hasRefreshed) {
    status = 'unknown';
  } else if (rawStatus.valid && !isExpired) {
    status = 'healthy';
  } else if (isExpired && rawStatus.lastRefreshSuccess) {
    status = 'warning';
  } else {
    status = 'error';
  }

  return {
    status,
    valid: rawStatus.valid && !isExpired,
    lastRefreshAt: rawStatus.lastRefreshAt || undefined,
    lastRefreshSuccess: rawStatus.lastRefreshSuccess,
    expiresAt: rawStatus.expiresAt,
    error: isExpired && !rawStatus.error ? 'Access Token 已过期' : rawStatus.error,
    errorCode: rawStatus.errorCode,
    supportsVerification: true,
  };
}
