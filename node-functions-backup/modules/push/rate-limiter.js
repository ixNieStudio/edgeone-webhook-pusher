/**
 * Rate Limiter - 频率限制器
 * Module: push
 */

/**
 * 检查频率限制
 * @param {{ count: number, resetAt: string }} state - 当前状态
 * @param {number} limit - 每分钟限制
 * @returns {{ allowed: boolean, remaining: number, resetAt: string, newCount: number }}
 */
export function checkRateLimit(state, limit = 5) {
  const currentTime = new Date();
  const resetAt = new Date(state?.resetAt || 0);

  // 时间窗口过期，重置
  if (currentTime >= resetAt) {
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(currentTime.getTime() + 60000).toISOString(),
      newCount: 1,
    };
  }

  // 检查是否超限
  const currentCount = state?.count || 0;
  if (currentCount < limit) {
    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetAt: state.resetAt,
      newCount: currentCount + 1,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: state.resetAt,
    newCount: currentCount,
  };
}

/**
 * 创建初始频率限制状态
 * @returns {{ count: number, resetAt: string }}
 */
export function createRateLimitState() {
  return {
    count: 0,
    resetAt: new Date(Date.now() + 60000).toISOString(),
  };
}

/**
 * RateLimiter 类 - 提供面向对象的接口
 */
class RateLimiter {
  constructor(limit = 5) {
    this.limit = limit;
  }

  /**
   * 检查是否允许
   * @param {{ count: number, resetAt: string }} state
   * @returns {{ allowed: boolean, remaining: number, resetAt: string }}
   */
  check(state) {
    const result = checkRateLimit(state, this.limit);
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  }

  /**
   * 获取更新后的状态
   * @param {{ count: number, resetAt: string }} state
   * @returns {{ count: number, resetAt: string }}
   */
  increment(state) {
    const result = checkRateLimit(state, this.limit);
    return {
      count: result.newCount,
      resetAt: result.resetAt,
    };
  }

  /**
   * 重置状态
   * @returns {{ count: number, resetAt: string }}
   */
  reset() {
    return createRateLimitState();
  }
}

export const rateLimiter = new RateLimiter();
