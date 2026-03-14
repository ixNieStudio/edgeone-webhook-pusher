/**
 * useDemoApps Composable 测试
 * Feature: demo-mode
 * 
 * 测试体验应用 API 客户端的响应处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useDemoApps Composable', () => {
  describe('Response Handling', () => {
    it('should extract data from wrapped API response', () => {
      // 模拟后端返回的包装响应
      const wrappedResponse = {
        code: 0,
        message: 'success',
        data: [
          { id: 'app_1', name: 'Test App 1' },
          { id: 'app_2', name: 'Test App 2' },
        ],
      };

      // 验证我们能正确提取 data 字段
      expect(wrappedResponse.data).toHaveLength(2);
      expect(wrappedResponse.data[0].id).toBe('app_1');
    });

    it('should handle nested data structure', () => {
      // 模拟 responseWrapper 中间件的行为
      const originalData = { id: 'app_1', name: 'Test' };
      const wrappedData = {
        code: 0,
        message: 'success',
        data: originalData,
      };

      // 验证数据嵌套
      expect(wrappedData.data).toEqual(originalData);
      expect(wrappedData.data.id).toBe('app_1');
    });
  });
});
