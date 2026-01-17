/**
 * Cleanup Service - 体验应用清理服务
 * Feature: demo-mode
 * 
 * 负责定期清理过期的体验应用，使用防抖机制避免频繁执行
 */

class CleanupService {
  private lastCleanupTime: number = 0;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1小时

  /**
   * 触发清理任务（带防抖）
   * 
   * 防抖机制：1小时内只执行一次清理任务
   * 这样可以避免频繁的清理操作影响性能
   */
  async triggerCleanup(): Promise<void> {
    const now = Date.now();

    // 防抖：1小时内只执行一次
    if (now - this.lastCleanupTime < this.CLEANUP_INTERVAL) {
      return;
    }

    try {
      // 动态导入避免循环依赖
      const { demoAppService } = await import('./demo-app.service.js');
      const count = await demoAppService.cleanupExpired();
      
      // 只有清理成功才更新时间戳
      this.lastCleanupTime = now;
      console.log(`[CleanupService] Cleaned up ${count} expired demo apps`);
    } catch (error) {
      console.error('[CleanupService] Cleanup failed:', error);
      // 清理失败时不更新时间戳，允许下次重试
    }
  }

  /**
   * 重置防抖计时器（仅用于测试）
   */
  resetDebounce(): void {
    this.lastCleanupTime = 0;
  }

  /**
   * 获取上次清理时间（仅用于测试）
   */
  getLastCleanupTime(): number {
    return this.lastCleanupTime;
  }
}

export const cleanupService = new CleanupService();
