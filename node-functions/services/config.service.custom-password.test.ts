/**
 * Config Service Custom Password Tests
 * Feature: admin-password-customization
 * Tests for the new custom password functionality in resetAdminToken
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configService } from './config.service.js';
import { configKV } from '../shared/kv-client.js';
import { now } from '../shared/utils.js';
import type { SystemConfig } from '../types/index.js';

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

describe('ConfigService - Custom Password Support', () => {
  const mockConfig: SystemConfig = {
    adminToken: 'AT_oldtoken123',
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

  describe('Backward Compatibility', () => {
    it('should generate random token when no password provided', async () => {
      const result = await configService.resetAdminToken();
      
      expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
      expect(result.adminToken.length).toBeGreaterThanOrEqual(35);
      expect(result.adminToken).not.toBe(mockConfig.adminToken);
    });

    it('should generate random token when password is empty string', async () => {
      const result = await configService.resetAdminToken('', '');
      
      expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
      expect(result.adminToken.length).toBeGreaterThanOrEqual(35);
    });

    it('should generate random token when password is null', async () => {
      const result = await configService.resetAdminToken(null as any, null as any);
      
      expect(result.adminToken).toMatch(/^AT_[A-Za-z0-9_-]+$/);
      expect(result.adminToken.length).toBeGreaterThanOrEqual(35);
    });
  });

  describe('Custom Password Validation', () => {
    it('should accept valid custom password', async () => {
      const customPassword = 'MySecurePass123!';
      const result = await configService.resetAdminToken(customPassword, customPassword);
      
      expect(result.adminToken).toBe(customPassword);
    });

    it('should throw error when confirmation password is missing', async () => {
      await expect(
        configService.resetAdminToken('MySecurePass123!')
      ).rejects.toThrow('CONFIRMATION_REQUIRED');
    });

    it('should throw error when passwords do not match', async () => {
      await expect(
        configService.resetAdminToken('MySecurePass123!', 'DifferentPass123!')
      ).rejects.toThrow('PASSWORD_MISMATCH');
    });

    it('should throw error when password is too short', async () => {
      const shortPassword = 'Short1!';
      await expect(
        configService.resetAdminToken(shortPassword, shortPassword)
      ).rejects.toThrow('PASSWORD_INVALID');
    });

    it('should throw error when password missing uppercase', async () => {
      const noUppercase = 'lowercase123!';
      await expect(
        configService.resetAdminToken(noUppercase, noUppercase)
      ).rejects.toThrow('PASSWORD_INVALID');
    });

    it('should throw error when password missing lowercase', async () => {
      const noLowercase = 'UPPERCASE123!';
      await expect(
        configService.resetAdminToken(noLowercase, noLowercase)
      ).rejects.toThrow('PASSWORD_INVALID');
    });

    it('should throw error when password missing number', async () => {
      const noNumber = 'NoNumbersHere!';
      await expect(
        configService.resetAdminToken(noNumber, noNumber)
      ).rejects.toThrow('PASSWORD_INVALID');
    });

    it('should throw error when password missing special character', async () => {
      const noSpecial = 'NoSpecialChar123';
      await expect(
        configService.resetAdminToken(noSpecial, noSpecial)
      ).rejects.toThrow('PASSWORD_INVALID');
    });
  });

  describe('Password Format', () => {
    it('should use custom password without prefix', async () => {
      const customPassword = 'MySecurePass123!';
      const result = await configService.resetAdminToken(customPassword, customPassword);
      
      expect(result.adminToken).toBe(customPassword);
      expect(result.adminToken).not.toMatch(/^AT_/);
    });

    it('should accept password with various special characters', async () => {
      const passwords = [
        'ValidPass123!',
        'ValidPass123@',
        'ValidPass123#',
        'ValidPass123$',
        'ValidPass123%',
        'ValidPass123^',
        'ValidPass123&',
        'ValidPass123*',
      ];

      for (const pwd of passwords) {
        const result = await configService.resetAdminToken(pwd, pwd);
        expect(result.adminToken).toBe(pwd);
      }
    });
  });

  describe('Configuration Update', () => {
    it('should preserve other config fields when using custom password', async () => {
      const customPassword = 'MySecurePass123!';
      const result = await configService.resetAdminToken(customPassword, customPassword);
      
      expect(result.rateLimit).toEqual(mockConfig.rateLimit);
      expect(result.retention).toEqual(mockConfig.retention);
      expect(result.createdAt).toBe(mockConfig.createdAt);
    });

    it('should update updatedAt timestamp', async () => {
      const mockNow = '2024-12-01T00:00:00.000Z';
      vi.mocked(now).mockReturnValue(mockNow);
      
      const customPassword = 'MySecurePass123!';
      const result = await configService.resetAdminToken(customPassword, customPassword);
      
      expect(result.updatedAt).toBe(mockNow);
    });

    it('should save updated config to KV store', async () => {
      const customPassword = 'MySecurePass123!';
      await configService.resetAdminToken(customPassword, customPassword);
      
      expect(configKV.put).toHaveBeenCalledTimes(1);
      expect(configKV.put).toHaveBeenCalledWith(
        'config',
        expect.objectContaining({
          adminToken: customPassword,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when config is not initialized', async () => {
      vi.mocked(configKV.get).mockResolvedValue(null);
      
      await expect(
        configService.resetAdminToken('MySecurePass123!', 'MySecurePass123!')
      ).rejects.toThrow('Configuration not initialized');
    });

    it('should throw error when KV store fails', async () => {
      vi.mocked(configKV.put).mockRejectedValue(new Error('KV storage failed'));
      
      await expect(
        configService.resetAdminToken('MySecurePass123!', 'MySecurePass123!')
      ).rejects.toThrow('Failed to update configuration');
    });
  });
});
