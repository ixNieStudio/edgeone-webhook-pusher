/**
 * 体验模式环境变量解析测试
 * Feature: demo-mode
 * 
 * 测试环境变量 DEMO_MODE 的解析逻辑
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * 解析 DEMO_MODE 环境变量
 * 只有当值为 'true' 字符串时才返回 true
 */
export function parseDemoMode(value: string | undefined): boolean {
  return value === 'true';
}

describe('Demo Mode Environment Variable Parsing', () => {
  describe('Unit Tests', () => {
    it('should return true when DEMO_MODE is "true"', () => {
      expect(parseDemoMode('true')).toBe(true);
    });

    it('should return false when DEMO_MODE is undefined', () => {
      expect(parseDemoMode(undefined)).toBe(false);
    });

    it('should return false when DEMO_MODE is "false"', () => {
      expect(parseDemoMode('false')).toBe(false);
    });

    it('should return false when DEMO_MODE is empty string', () => {
      expect(parseDemoMode('')).toBe(false);
    });

    it('should return false when DEMO_MODE is "TRUE" (uppercase)', () => {
      expect(parseDemoMode('TRUE')).toBe(false);
    });

    it('should return false when DEMO_MODE is "1"', () => {
      expect(parseDemoMode('1')).toBe(false);
    });

    it('should return false when DEMO_MODE is any other string', () => {
      expect(parseDemoMode('yes')).toBe(false);
      expect(parseDemoMode('enabled')).toBe(false);
      expect(parseDemoMode('on')).toBe(false);
    });
  });

  describe('Property Tests', () => {
    /**
     * Property 1: 环境变量正确控制体验模式
     * Feature: demo-mode, Property 1: 环境变量正确控制体验模式
     * Validates: Requirements 1.1, 1.2
     */
    it('should only return true for exactly "true" string', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const result = parseDemoMode(value);
          
          if (value === 'true') {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should return false for undefined or any non-"true" value', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string().filter(s => s !== 'true'), { nil: undefined }),
          (value) => {
            expect(parseDemoMode(value)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
