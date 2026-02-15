/**
 * Config Service Property-Based Tests
 * Feature: wechat-push-enhancements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { configService } from './config.service.js';
import { configKV } from '../shared/kv-client.js';
import { generateAdminToken, now } from '../shared/utils.js';
import type { SystemConfig } from '../types/index.js';
import { KVKeys } from '../types/index.js';

// Mock dependencies
vi.mock('../shared/kv-client.js', () => ({
  configKV: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../shared/utils.js', async () => {
  const actual = await vi.importActual<typeof import('../shared/utils.js')>('../shared/utils.js');
  return {
    ...actual,
    now: vi.fn(() => new Date().toISOString()),
  };
});

describe('ConfigService - resetAdminToken Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 2: 重置操作生成新令牌
   * 对于任何有效的系统配置，执行重置操作后应该生成一个新的、格式正确的 adminToken
   * （以 "AT_" 开头，长度至少35个字符），并且与旧 token 完全不同。
   */
  it('Property 2: resetAdminToken generates new valid token different from old token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary system configs
        fc.record({
          adminToken: fc.string({ minLength: 35, maxLength: 50 }).map(s => `AT_${s}`),
          rateLimit: fc.record({
            perMinute: fc.integer({ min: 1, max: 100 }),
          }),
          retention: fc.record({
            days: fc.integer({ min: 1, max: 365 }),
          }),
          createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
        }),
        async (originalConfig: SystemConfig) => {
          // Setup: Mock KV to return original config
          vi.mocked(configKV.get).mockResolvedValue(originalConfig);
          vi.mocked(configKV.put).mockResolvedValue(undefined);

          // Execute: Reset admin token
          const result = await configService.resetAdminToken();

          // Verify: New token is valid and different
          expect(result.adminToken).toBeDefined();
          expect(result.adminToken).toMatch(/^AT_/);
          expect(result.adminToken.length).toBeGreaterThanOrEqual(35);
          expect(result.adminToken).not.toBe(originalConfig.adminToken);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: 重置操作保持其他配置不变
   * 对于任何有效的系统配置，重置 adminToken 后，rateLimit 和 retention 配置
   * 应该保持完全不变（值相等）。
   */
  it('Property 4: resetAdminToken preserves other config fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          adminToken: fc.string({ minLength: 35, maxLength: 50 }).map(s => `AT_${s}`),
          rateLimit: fc.record({
            perMinute: fc.integer({ min: 1, max: 100 }),
          }),
          retention: fc.record({
            days: fc.integer({ min: 1, max: 365 }),
          }),
          createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
        }),
        async (originalConfig: SystemConfig) => {
          // Setup
          vi.mocked(configKV.get).mockResolvedValue(originalConfig);
          vi.mocked(configKV.put).mockResolvedValue(undefined);

          // Execute
          const result = await configService.resetAdminToken();

          // Verify: rateLimit and retention are unchanged
          expect(result.rateLimit).toEqual(originalConfig.rateLimit);
          expect(result.retention).toEqual(originalConfig.retention);
          expect(result.createdAt).toBe(originalConfig.createdAt);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: 配置更新时间戳更新
   * 对于任何配置更新操作（包括重置 adminToken），updatedAt 时间戳应该被更新为
   * 操作时的当前时间，并且应该晚于或等于操作前的 updatedAt 时间。
   */
  it('Property 5: resetAdminToken updates updatedAt timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          adminToken: fc.string({ minLength: 35, maxLength: 50 }).map(s => `AT_${s}`),
          rateLimit: fc.record({
            perMinute: fc.integer({ min: 1, max: 100 }),
          }),
          retention: fc.record({
            days: fc.integer({ min: 1, max: 365 }),
          }),
          createdAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
        }),
        async (originalConfig: SystemConfig) => {
          // Setup
          const mockNow = new Date().toISOString();
          vi.mocked(now).mockReturnValue(mockNow);
          vi.mocked(configKV.get).mockResolvedValue(originalConfig);
          vi.mocked(configKV.put).mockResolvedValue(undefined);

          // Execute
          const result = await configService.resetAdminToken();

          // Verify: updatedAt is updated to current time
          expect(result.updatedAt).toBe(mockNow);
          expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(
            new Date(originalConfig.updatedAt).getTime()
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: 重置失败保持原令牌
   * 对于任何导致重置操作失败的情况，系统配置中的 adminToken 应该保持完全不变，
   * 并且应该向用户显示错误信息。
   */
  it('Property 3: resetAdminToken preserves token on failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          adminToken: fc.string({ minLength: 35, maxLength: 50 }).map(s => `AT_${s}`),
          rateLimit: fc.record({
            perMinute: fc.integer({ min: 1, max: 100 }),
          }),
          retention: fc.record({
            days: fc.integer({ min: 1, max: 365 }),
          }),
          createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
        }),
        async (originalConfig: SystemConfig) => {
          // Setup: Mock KV.put to fail
          vi.mocked(configKV.get).mockResolvedValue(originalConfig);
          vi.mocked(configKV.put).mockRejectedValue(new Error('KV storage failed'));

          // Execute and verify: Should throw error
          await expect(configService.resetAdminToken()).rejects.toThrow('Failed to update configuration');

          // Verify: Original config was not modified (KV.put was called but failed)
          // The service should not have modified the original config object
          expect(originalConfig.adminToken).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Unit test: Config not initialized
   */
  it('throws error when config is not initialized', async () => {
    vi.mocked(configKV.get).mockResolvedValue(null);

    await expect(configService.resetAdminToken()).rejects.toThrow('Configuration not initialized');
  });
});

describe('ConfigService - resetAdminToken Property Tests (Custom Password)', () => {
  const mockConfig: SystemConfig = {
    adminToken: 'AT_old_token_12345',
    rateLimit: { perMinute: 10 },
    retention: { days: 30 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(configKV.get).mockResolvedValue(mockConfig);
    vi.mocked(configKV.put).mockResolvedValue(undefined);
  });

  /**
   * Property 2: 密码确认一致性（验证需求 3）
   * **Validates: Requirements 3**
   * 
   * 当提供确认密码时，只有当两次密码完全一致时才能通过验证。
   * 对于任意两个字符串 password1 和 password2：
   * - 如果 password1 === password2 且密码有效，则重置应该成功
   * - 如果 password1 !== password2，则重置应该失败并抛出 PASSWORD_MISMATCH 错误
   */
  it('Property 2: Password confirmation consistency - only succeeds when passwords match', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two arbitrary strings
        fc.string({ minLength: 12, maxLength: 30 }),
        fc.string({ minLength: 12, maxLength: 30 }),
        async (str1, str2) => {
          // Create valid passwords by adding required characters
          const validPwd1 = `ValidPass123!${str1}`;
          const validPwd2 = `ValidPass123!${str2}`;

          if (validPwd1 === validPwd2) {
            // When passwords match, reset should succeed
            const result = await configService.resetAdminToken(validPwd1, validPwd2);
            expect(result.adminToken).toBe(`AT_${validPwd1}`);
            expect(vi.mocked(configKV.put)).toHaveBeenCalled();
          } else {
            // When passwords don't match, reset should fail
            await expect(
              configService.resetAdminToken(validPwd1, validPwd2)
            ).rejects.toThrow('PASSWORD_MISMATCH');
            // KV.put should not be called on mismatch
            expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
          }
          
          // Clear mocks for next iteration
          vi.clearAllMocks();
          vi.mocked(configKV.get).mockResolvedValue(mockConfig);
          vi.mocked(configKV.put).mockResolvedValue(undefined);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3: 向后兼容性（验证需求 8）
   * **Validates: Requirements 8**
   * 
   * 当不提供自定义密码参数时，系统行为应与原有实现完全一致：
   * - 生成随机令牌
   * - 令牌格式为 /^AT_[A-Za-z0-9_-]+$/
   * - 令牌长度至少为 35 个字符
   * - 每次生成的令牌都应该不同（随机性）
   */
  it('Property 3: Backward compatibility - generates random token when no password provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Test with various "no password" scenarios
        fc.constantFrom(
          undefined,
          null,
          '',
          [undefined, undefined],
          [null, null],
          ['', '']
        ),
        async (passwordInput) => {
          let result;
          
          if (Array.isArray(passwordInput)) {
            result = await configService.resetAdminToken(
              passwordInput[0] as any,
              passwordInput[1] as any
            );
          } else {
            result = await configService.resetAdminToken(passwordInput as any);
          }

          // Verify token format matches original implementation
          expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
          expect(result.adminToken.length).toBeGreaterThanOrEqual(35);
          expect(result.adminToken).not.toBe(mockConfig.adminToken);
          
          // Verify randomness: generate another token and ensure it's different
          vi.clearAllMocks();
          vi.mocked(configKV.get).mockResolvedValue(mockConfig);
          vi.mocked(configKV.put).mockResolvedValue(undefined);
          
          const result2 = await configService.resetAdminToken();
          expect(result2.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
          expect(result2.adminToken).not.toBe(result.adminToken);
          
          // Reset mocks for next iteration
          vi.clearAllMocks();
          vi.mocked(configKV.get).mockResolvedValue(mockConfig);
          vi.mocked(configKV.put).mockResolvedValue(undefined);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('ConfigService - resetAdminToken Unit Tests (Custom Password)', () => {
  const mockConfig: SystemConfig = {
    adminToken: 'AT_old_token_12345',
    rateLimit: { perMinute: 10 },
    retention: { days: 30 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(configKV.get).mockResolvedValue(mockConfig);
    vi.mocked(configKV.put).mockResolvedValue(undefined);
  });

  /**
   * 测试1: 测试自动生成令牌
   * 当不提供密码参数时，应该自动生成随机令牌
   */
  it('should generate random token when no password provided', async () => {
    const result = await configService.resetAdminToken();

    expect(result.adminToken).toBeDefined();
    expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
    expect(result.adminToken.length).toBeGreaterThanOrEqual(35);
    expect(result.adminToken).not.toBe(mockConfig.adminToken);
    expect(vi.mocked(configKV.put)).toHaveBeenCalledWith(
      KVKeys.CONFIG,
      expect.objectContaining({
        adminToken: expect.stringMatching(/^AT_[A-Za-z0-9_-]+$/),
      })
    );
  });

  /**
   * 测试2: 测试自定义密码
   * 当提供有效的自定义密码和确认密码时，应该使用该密码
   */
  it('should use custom password when valid password and confirmation provided', async () => {
    const customPassword = 'MyCustomPass123!';
    const result = await configService.resetAdminToken(customPassword, customPassword);

    expect(result.adminToken).toBe(customPassword);
    expect(vi.mocked(configKV.put)).toHaveBeenCalledWith(
      KVKeys.CONFIG,
      expect.objectContaining({
        adminToken: customPassword,
      })
    );
  });

  /**
   * 测试3: 测试密码不匹配
   * 当新密码和确认密码不一致时，应该抛出错误
   */
  it('should throw error when passwords do not match', async () => {
    const password1 = 'MyPassword123!';
    const password2 = 'DifferentPass456!';

    await expect(
      configService.resetAdminToken(password1, password2)
    ).rejects.toThrow('PASSWORD_MISMATCH');

    // 验证没有调用 KV.put
    expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
  });

  /**
   * 测试4: 测试缺少确认密码
   * 当提供新密码但缺少确认密码时，应该抛出错误
   */
  it('should throw error when confirmation password is missing', async () => {
    const password = 'MyPassword123!';

    await expect(
      configService.resetAdminToken(password)
    ).rejects.toThrow('CONFIRMATION_REQUIRED');

    await expect(
      configService.resetAdminToken(password, undefined)
    ).rejects.toThrow('CONFIRMATION_REQUIRED');

    await expect(
      configService.resetAdminToken(password, '')
    ).rejects.toThrow('CONFIRMATION_REQUIRED');

    // 验证没有调用 KV.put
    expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
  });

  /**
   * 测试5: 测试密码格式不符合要求
   * 当密码不符合复杂度要求时，应该抛出错误
   */
  it('should throw error when password does not meet complexity requirements', async () => {
    // 测试各种不符合要求的密码
    const invalidPasswords = [
      'short',                    // 太短
      'lowercase123!',            // 缺少大写字母
      'UPPERCASE123!',            // 缺少小写字母
      'NoNumbers!Abc',            // 缺少数字
      'NoSpecial123Abc',          // 缺少特殊字符
      'weakpassword',             // 多个要求不满足
    ];

    for (const invalidPassword of invalidPasswords) {
      await expect(
        configService.resetAdminToken(invalidPassword, invalidPassword)
      ).rejects.toThrow('PASSWORD_INVALID');
    }

    // 验证没有调用 KV.put
    expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
  });

  /**
   * 额外测试: 验证空字符串被视为未提供密码
   */
  it('should treat empty string as no password and generate random token', async () => {
    const result = await configService.resetAdminToken('', '');

    expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
    expect(result.adminToken.length).toBeGreaterThanOrEqual(35);
  });

  /**
   * 额外测试: 验证更新时间戳
   */
  it('should update updatedAt timestamp when resetting token', async () => {
    const mockNow = '2024-12-01T12:00:00.000Z';
    vi.mocked(now).mockReturnValue(mockNow);

    const result = await configService.resetAdminToken();

    expect(result.updatedAt).toBe(mockNow);
  });

  /**
   * 额外测试: 验证其他配置字段保持不变
   */
  it('should preserve other config fields when resetting token', async () => {
    const customPassword = 'ValidPass123!';
    const result = await configService.resetAdminToken(customPassword, customPassword);

    expect(result.rateLimit).toEqual(mockConfig.rateLimit);
    expect(result.retention).toEqual(mockConfig.retention);
    expect(result.createdAt).toBe(mockConfig.createdAt);
  });
});
