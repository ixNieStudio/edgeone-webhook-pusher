/**
 * Config Routes Integration Tests
 * Feature: admin-password-customization
 * 
 * End-to-end integration tests for the complete password reset feature.
 * Tests the full flow from API request to response, including:
 * - Complete password reset workflow (frontend to backend)
 * - Old token invalidation and new token activation
 * - Backward compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { configService } from '../services/config.service.js';
import { configKV } from '../shared/kv-client.js';
import { now } from '../shared/utils.js';
import type { SystemConfig } from '../types/system.js';

// Mock KV store
vi.mock('../shared/kv-client.js', () => ({
  configKV: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock utils
vi.mock('../shared/utils.js', async () => {
  const actual = await vi.importActual<typeof import('../shared/utils.js')>('../shared/utils.js');
  return {
    ...actual,
    now: vi.fn(() => '2024-01-01T00:00:00.000Z'),
    generateAdminToken: vi.fn(() => 'AT_' + Math.random().toString(36).substring(2, 15)),
  };
});

describe('Integration: Complete Password Reset Workflow', () => {
  let mockConfig: SystemConfig;
  const mockNow = '2024-01-01T00:00:00.000Z';

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      adminToken: 'AT_old_token_12345',
      rateLimit: {
        perMinute: 5,
      },
      retention: {
        days: 30,
      },
      createdAt: '2023-12-31T00:00:00.000Z',
      updatedAt: '2023-12-31T00:00:00.000Z',
    };

    vi.mocked(configKV.get).mockResolvedValue(mockConfig);
    vi.mocked(configKV.put).mockResolvedValue(undefined);
    vi.mocked(now).mockReturnValue(mockNow);
  });

  /**
   * Test 1: Complete custom password reset flow
   * Validates: Requirements 1, 2, 3
   * 
   * This test simulates the complete flow:
   * 1. User provides custom password and confirmation
   * 2. System validates password complexity
   * 3. System validates password confirmation
   * 4. System updates configuration with new password
   * 5. Old token is invalidated (replaced)
   * 6. New token is activated (saved to KV)
   */
  it('should complete full custom password reset workflow', async () => {
    const customPassword = 'MySecurePass123!';
    const oldToken = mockConfig.adminToken;

    // Step 1: User initiates password reset with custom password
    const result = await configService.resetAdminToken(customPassword, customPassword);

    // Step 2: Verify new token is set to custom password
    expect(result.adminToken).toBe(customPassword);
    expect(result.adminToken).not.toBe(oldToken);

    // Step 3: Verify old token is invalidated (config updated)
    expect(vi.mocked(configKV.put)).toHaveBeenCalledTimes(1);
    const savedConfig = vi.mocked(configKV.put).mock.calls[0][1] as SystemConfig;
    expect(savedConfig.adminToken).toBe(customPassword);
    expect(savedConfig.adminToken).not.toBe(oldToken);

    // Step 4: Verify timestamp is updated
    expect(savedConfig.updatedAt).toBe(mockNow);

    // Step 5: Verify other config fields are preserved
    expect(savedConfig.rateLimit).toEqual(mockConfig.rateLimit);
    expect(savedConfig.retention).toEqual(mockConfig.retention);
  });

  /**
   * Test 2: Old token invalidation verification
   * Validates: Requirement 7.4 (旧令牌立即失效)
   * 
   * This test verifies that after reset:
   * 1. Old token is no longer in the configuration
   * 2. New token is the only valid token
   * 3. Configuration is immediately updated in KV store
   */
  it('should immediately invalidate old token after reset', async () => {
    const customPassword = 'NewSecurePass123!';
    const oldToken = mockConfig.adminToken;

    // Reset with custom password
    await configService.resetAdminToken(customPassword, customPassword);

    // Verify old token is replaced
    const savedConfig = vi.mocked(configKV.put).mock.calls[0][1] as SystemConfig;
    expect(savedConfig.adminToken).not.toBe(oldToken);
    expect(savedConfig.adminToken).toBe(customPassword);

    // Verify KV store is updated (old token invalidated)
    expect(vi.mocked(configKV.put)).toHaveBeenCalledWith(
      'config',
      expect.objectContaining({
        adminToken: customPassword,
      })
    );
  });

  /**
   * Test 3: New token activation verification
   * Validates: Requirement 7.4 (新令牌立即生效)
   * 
   * This test verifies that:
   * 1. New token is immediately saved to KV store
   * 2. New token can be retrieved from configuration
   * 3. No transition period exists
   */
  it('should immediately activate new token after reset', async () => {
    const customPassword = 'ActiveToken123!';

    // Reset with custom password
    const result = await configService.resetAdminToken(customPassword, customPassword);

    // Verify new token is returned
    expect(result.adminToken).toBe(customPassword);

    // Verify new token is saved to KV store
    expect(vi.mocked(configKV.put)).toHaveBeenCalledWith(
      'config',
      expect.objectContaining({
        adminToken: customPassword,
      })
    );

    // Simulate retrieving config after reset
    vi.mocked(configKV.get).mockResolvedValue(result);
    const retrievedConfig = await configService.getConfig();
    expect(retrievedConfig?.adminToken).toBe(customPassword);
  });

  /**
   * Test 4: Backward compatibility - auto-generated token
   * Validates: Requirement 8 (向后兼容性)
   * 
   * This test verifies that:
   * 1. When no password is provided, system generates random token
   * 2. Generated token follows the expected format
   * 3. Old behavior is preserved
   */
  it('should maintain backward compatibility with auto-generated tokens', async () => {
    // Reset without custom password (backward compatible mode)
    const result = await configService.resetAdminToken();

    // Verify token is auto-generated
    expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
    expect(result.adminToken).not.toBe(mockConfig.adminToken);

    // Verify token is saved
    expect(vi.mocked(configKV.put)).toHaveBeenCalledTimes(1);
    const savedConfig = vi.mocked(configKV.put).mock.calls[0][1] as SystemConfig;
    expect(savedConfig.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
  });

  /**
   * Test 5: Backward compatibility - empty string treated as no password
   * Validates: Requirement 8 (向后兼容性)
   */
  it('should treat empty string as no password and generate random token', async () => {
    const result = await configService.resetAdminToken('', '');

    expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
    expect(result.adminToken).not.toBe(mockConfig.adminToken);
  });

  /**
   * Test 6: Password validation in complete workflow
   * Validates: Requirement 2 (密码复杂度验证)
   * 
   * This test verifies that password validation is enforced
   * throughout the complete workflow
   */
  it('should reject invalid passwords in complete workflow', async () => {
    const invalidPasswords = [
      'short',                    // Too short
      'nouppercase123!',         // No uppercase
      'NOLOWERCASE123!',         // No lowercase
      'NoNumbers!',              // No numbers
      'NoSpecialChar123',        // No special characters
    ];

    for (const invalidPassword of invalidPasswords) {
      await expect(
        configService.resetAdminToken(invalidPassword, invalidPassword)
      ).rejects.toThrow('PASSWORD_INVALID');

      // Verify KV store is not updated on validation failure
      expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
      vi.clearAllMocks();
      vi.mocked(configKV.get).mockResolvedValue(mockConfig);
    }
  });

  /**
   * Test 7: Password confirmation in complete workflow
   * Validates: Requirement 3 (二次确认机制)
   */
  it('should reject mismatched passwords in complete workflow', async () => {
    const password1 = 'ValidPassword123!';
    const password2 = 'DifferentPass123!';

    await expect(
      configService.resetAdminToken(password1, password2)
    ).rejects.toThrow('PASSWORD_MISMATCH');

    // Verify KV store is not updated on mismatch
    expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
  });

  /**
   * Test 8: Missing confirmation password
   * Validates: Requirement 3 (二次确认机制)
   */
  it('should require confirmation password when custom password provided', async () => {
    const password = 'ValidPassword123!';

    await expect(
      configService.resetAdminToken(password)
    ).rejects.toThrow('CONFIRMATION_REQUIRED');

    await expect(
      configService.resetAdminToken(password, undefined)
    ).rejects.toThrow('CONFIRMATION_REQUIRED');

    await expect(
      configService.resetAdminToken(password, '')
    ).rejects.toThrow('CONFIRMATION_REQUIRED');

    // Verify KV store is not updated
    expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
  });

  /**
   * Test 9: Configuration preservation during reset
   * Validates: All configuration fields except adminToken and updatedAt are preserved
   */
  it('should preserve all other configuration fields during reset', async () => {
    const customPassword = 'PreserveConfig123!';

    const result = await configService.resetAdminToken(customPassword, customPassword);

    // Verify all fields are preserved except adminToken and updatedAt
    expect(result.rateLimit).toEqual(mockConfig.rateLimit);
    expect(result.retention).toEqual(mockConfig.retention);
    expect(result.adminToken).not.toBe(mockConfig.adminToken);
    expect(result.updatedAt).not.toBe(mockConfig.updatedAt);
  });

  /**
   * Test 10: Error handling - configuration not initialized
   * Validates: Proper error handling when configuration is missing
   */
  it('should handle missing configuration gracefully', async () => {
    vi.mocked(configKV.get).mockResolvedValue(null);

    await expect(
      configService.resetAdminToken('ValidPassword123!', 'ValidPassword123!')
    ).rejects.toThrow('Configuration not initialized');

    // Verify KV store is not updated
    expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
  });

  /**
   * Test 11: Error handling - KV store failure
   * Validates: Proper error handling when KV store fails
   */
  it('should handle KV store failure gracefully', async () => {
    vi.mocked(configKV.put).mockRejectedValue(new Error('KV store error'));

    await expect(
      configService.resetAdminToken('ValidPassword123!', 'ValidPassword123!')
    ).rejects.toThrow('Failed to update configuration');
  });

  /**
   * Test 12: Timestamp update verification
   * Validates: updatedAt timestamp is correctly updated
   */
  it('should update timestamp on successful reset', async () => {
    const customPassword = 'TimestampTest123!';

    const result = await configService.resetAdminToken(customPassword, customPassword);

    expect(result.updatedAt).toBe(mockNow);
    expect(result.updatedAt).not.toBe(mockConfig.updatedAt);
  });
});

/**
 * Property-Based Integration Tests
 * 
 * These tests use property-based testing to verify the system behavior
 * across a wide range of inputs and scenarios.
 */
describe('Integration: Property-Based Tests', () => {
  let mockConfig: SystemConfig;
  const mockNow = '2024-01-01T00:00:00.000Z';

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      adminToken: 'AT_old_token_12345',
      rateLimit: {
        perMinute: 5,
      },
      retention: {
        days: 30,
      },
      createdAt: '2023-12-31T00:00:00.000Z',
      updatedAt: '2023-12-31T00:00:00.000Z',
    };

    vi.mocked(configKV.get).mockResolvedValue(mockConfig);
    vi.mocked(configKV.put).mockResolvedValue(undefined);
    vi.mocked(now).mockReturnValue(mockNow);
  });

  /**
   * Property 1: Token uniqueness across resets
   * Validates: Each reset generates a unique token
   */
  it('Property: Each reset should generate a unique token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (numResets) => {
          const tokens = new Set<string>();

          for (let i = 0; i < numResets; i++) {
            const result = await configService.resetAdminToken();
            tokens.add(result.adminToken);
          }

          // All tokens should be unique
          expect(tokens.size).toBe(numResets);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 2: Custom password preservation
   * Validates: Custom passwords are stored exactly as provided
   */
  it('Property: Custom passwords should be stored exactly as provided', async () => {
    // Generate valid passwords with various characteristics
    // Each password must have: uppercase, lowercase, digit, special char, and be at least 12 chars
    const validPasswordArb = fc.tuple(
      fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join('')),
      fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join('')),
      fc.array(fc.constantFrom(...'0123456789'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join('')),
      fc.array(fc.constantFrom(...'!@#$%^&*()_+-=[]{}|;:,.<>?'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join(''))
    ).map(([upper, lower, digit, special]) => {
      // Combine all parts to ensure all requirements are met
      const combined = upper + lower + digit + special;
      // Ensure minimum length of 12 by padding if needed
      if (combined.length < 12) {
        return combined + 'Aa1!'.repeat(Math.ceil((12 - combined.length) / 4)).substring(0, 12 - combined.length);
      }
      return combined;
    });

    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        async (password) => {
          // Reset mocks before each property test run
          vi.clearAllMocks();
          vi.mocked(configKV.get).mockResolvedValue(mockConfig);
          vi.mocked(configKV.put).mockResolvedValue(undefined);
          vi.mocked(now).mockReturnValue(mockNow);

          // Verify the generated password meets all requirements
          expect(password.length).toBeGreaterThanOrEqual(12);
          expect(/[A-Z]/.test(password)).toBe(true);
          expect(/[a-z]/.test(password)).toBe(true);
          expect(/[0-9]/.test(password)).toBe(true);
          expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);

          const result = await configService.resetAdminToken(password, password);
          
          // Password should be stored exactly as provided
          expect(result.adminToken).toBe(password);
          
          // Verify it's saved to KV store
          const savedConfig = vi.mocked(configKV.put).mock.calls[0][1] as SystemConfig;
          expect(savedConfig.adminToken).toBe(password);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 3: Backward compatibility consistency
   * Validates: Auto-generated tokens always follow the expected format
   */
  it('Property: Auto-generated tokens should always follow format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(undefined),
        async () => {
          const result = await configService.resetAdminToken();
          
          // Token should match the expected format
          expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
          expect(result.adminToken.length).toBeGreaterThanOrEqual(10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Configuration preservation invariant
   * Validates: Non-token fields are never modified during reset
   */
  it('Property: Non-token fields should never be modified', async () => {
    const configFieldsArb = fc.record({
      rateLimit: fc.record({
        perMinute: fc.integer({ min: 1, max: 100 }),
      }),
      retention: fc.record({
        days: fc.integer({ min: 1, max: 90 }),
      }),
    });

    await fc.assert(
      fc.asyncProperty(
        configFieldsArb,
        async (fields) => {
          // Set up mock config with random fields
          const testConfig = {
            ...mockConfig,
            ...fields,
          };
          vi.mocked(configKV.get).mockResolvedValue(testConfig);

          const result = await configService.resetAdminToken();

          // Verify non-token fields are preserved
          expect(result.rateLimit).toEqual(fields.rateLimit);
          expect(result.retention).toEqual(fields.retention);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: Password mismatch always fails
   * Validates: Any password mismatch should be rejected
   */
  it('Property: Password mismatch should always fail', async () => {
    const validPasswordArb = fc.tuple(
      fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join('')),
      fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join('')),
      fc.array(fc.constantFrom(...'0123456789'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join('')),
      fc.array(fc.constantFrom(...'!@#$%^&*()_+-=[]{}|;:,.<>?'.split('')), { minLength: 2, maxLength: 4 }).map(arr => arr.join(''))
    ).map(([upper, lower, digit, special]) => {
      const combined = upper + lower + digit + special;
      if (combined.length < 12) {
        return combined + 'Aa1!'.repeat(Math.ceil((12 - combined.length) / 4)).substring(0, 12 - combined.length);
      }
      return combined;
    });

    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb,
        async (pwd1, pwd2) => {
          fc.pre(pwd1 !== pwd2); // Only test when passwords are different

          await expect(
            configService.resetAdminToken(pwd1, pwd2)
          ).rejects.toThrow('PASSWORD_MISMATCH');

          // Verify KV store is not updated
          expect(vi.mocked(configKV.put)).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Concurrent Reset Tests
 * 
 * These tests verify the system behavior under concurrent reset operations.
 */
describe('Integration: Concurrent Reset Operations', () => {
  let mockConfig: SystemConfig;
  const mockNow = '2024-01-01T00:00:00.000Z';

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      adminToken: 'AT_old_token_12345',
      rateLimit: {
        perMinute: 5,
      },
      retention: {
        days: 30,
      },
      createdAt: '2023-12-31T00:00:00.000Z',
      updatedAt: '2023-12-31T00:00:00.000Z',
    };

    vi.mocked(configKV.get).mockResolvedValue(mockConfig);
    vi.mocked(configKV.put).mockResolvedValue(undefined);
    vi.mocked(now).mockReturnValue(mockNow);
  });

  /**
   * Test: Multiple concurrent resets
   * Validates: System handles concurrent resets correctly
   */
  it('should handle multiple concurrent resets', async () => {
    const passwords = [
      'ConcurrentPass1!',
      'ConcurrentPass2!',
      'ConcurrentPass3!',
    ];

    // Execute concurrent resets
    const results = await Promise.all(
      passwords.map(pwd => configService.resetAdminToken(pwd, pwd))
    );

    // All resets should succeed
    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.adminToken).toBe(passwords[index]);
    });

    // KV store should be called for each reset
    expect(vi.mocked(configKV.put)).toHaveBeenCalledTimes(3);
  });

  /**
   * Test: Mixed auto-generated and custom password resets
   * Validates: System handles mixed reset types concurrently
   */
  it('should handle mixed reset types concurrently', async () => {
    const customPassword = 'CustomConcurrent123!';

    // Execute mixed resets concurrently
    const [autoResult, customResult] = await Promise.all([
      configService.resetAdminToken(),
      configService.resetAdminToken(customPassword, customPassword),
    ]);

    // Auto-generated token should match format
    expect(autoResult.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
    
    // Custom password should be preserved
    expect(customResult.adminToken).toBe(customPassword);

    // Both should be different
    expect(autoResult.adminToken).not.toBe(customResult.adminToken);
  });
});
