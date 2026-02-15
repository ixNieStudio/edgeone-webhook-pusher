/**
 * Cleanup Service 测试
 * Feature: demo-mode
 * 
 * 测试清理服务的防抖机制
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { cleanupService } from './cleanup.service.js';
import { demoAppService } from './demo-app.service.js';

// Mock demo app service
vi.mock('./demo-app.service.js', () => ({
  demoAppService: {
    cleanupExpired: vi.fn().mockResolvedValue(0),
  },
}));

describe('Cleanup Service', () => {
  beforeEach(() => {
    // 每个测试前重置防抖计时器和 mock
    cleanupService.resetDebounce();
    vi.clearAllMocks();
    vi.mocked(demoAppService.cleanupExpired).mockResolvedValue(0);
  });

  describe('Unit Tests', () => {
    it('should execute cleanup on first trigger', async () => {
      const initialTime = cleanupService.getLastCleanupTime();
      expect(initialTime).toBe(0);

      await cleanupService.triggerCleanup();

      const afterTime = cleanupService.getLastCleanupTime();
      expect(afterTime).toBeGreaterThan(0);
    });

    it('should not execute cleanup within 1 hour', async () => {
      // 第一次触发
      await cleanupService.triggerCleanup();
      const firstTime = cleanupService.getLastCleanupTime();

      // 立即第二次触发
      await cleanupService.triggerCleanup();
      const secondTime = cleanupService.getLastCleanupTime();

      // 时间应该相同，说明第二次没有执行
      expect(secondTime).toBe(firstTime);
    });

    it('should execute cleanup after 1 hour', async () => {
      // 第一次触发
      await cleanupService.triggerCleanup();
      const firstTime = cleanupService.getLastCleanupTime();

      // 模拟1小时后
      const oneHourLater = firstTime + 60 * 60 * 1000 + 1000;
      vi.spyOn(Date, 'now').mockReturnValue(oneHourLater);

      // 第二次触发
      await cleanupService.triggerCleanup();
      const secondTime = cleanupService.getLastCleanupTime();

      // 时间应该更新
      expect(secondTime).toBeGreaterThan(firstTime);
      expect(secondTime).toBe(oneHourLater);

      vi.restoreAllMocks();
    });
  });

  describe('Property Tests', () => {
    /**
     * Property 15: 清理任务防抖
     * Feature: demo-mode, Property 15: 清理任务防抖
     * Validates: Requirements 10.3
     */
    it('should only execute once within 1 hour window', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }), // 触发次数
          async (triggerCount) => {
            cleanupService.resetDebounce();

            // 第一次触发
            await cleanupService.triggerCleanup();
            const firstTime = cleanupService.getLastCleanupTime();
            expect(firstTime).toBeGreaterThan(0);

            // 在1小时内多次触发
            for (let i = 0; i < triggerCount - 1; i++) {
              await cleanupService.triggerCleanup();
              const currentTime = cleanupService.getLastCleanupTime();
              
              // 时间应该保持不变
              expect(currentTime).toBe(firstTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute again after 1 hour interval', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // 执行次数
          async (executionCount) => {
            cleanupService.resetDebounce();
            const times: number[] = [];

            for (let i = 0; i < executionCount; i++) {
              const mockTime = Date.now() + i * (60 * 60 * 1000 + 1000);
              vi.spyOn(Date, 'now').mockReturnValue(mockTime);

              await cleanupService.triggerCleanup();
              times.push(cleanupService.getLastCleanupTime());

              vi.restoreAllMocks();
            }

            // 每次执行的时间应该都不同
            const uniqueTimes = new Set(times);
            expect(uniqueTimes.size).toBe(executionCount);

            // 每次执行的时间应该递增
            for (let i = 1; i < times.length; i++) {
              expect(times[i]).toBeGreaterThan(times[i - 1]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
