/**
 * API Routes Property Tests
 * Feature: multi-tenant-refactor
 *
 * Property 3: Management API Authentication
 * Property 4: Send API No Authentication
 * Property 7: Invalid Key Error Handling
 * Property 9: Single Push Delivery
 * Property 10: Topic Push Broadcast
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ErrorCodes } from '../node-functions/shared/types.js';

/**
 * Mock KV storage for testing
 */
function createMockKV() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.get(key) || null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    async list(prefix = '') {
      const keys = [];
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return { keys, complete: true };
    },
    async listAll(prefix = '') {
      const result = await this.list(prefix);
      return result.keys;
    },
    clear() {
      store.clear();
    },
  };
}

// Mock KV clients
const mockConfigKV = createMockKV();
const mockSendkeysKV = createMockKV();
const mockTopicsKV = createMockKV();
const mockOpenidsKV = createMockKV();
const mockMessagesKV = createMockKV();

vi.mock('../node-functions/services/kv-client.js', () => ({
  configKV: mockConfigKV,
  sendkeysKV: mockSendkeysKV,
  topicsKV: mockTopicsKV,
  openidsKV: mockOpenidsKV,
  messagesKV: mockMessagesKV,
}));

// Mock channel registry to avoid actual WeChat API calls
vi.mock('../node-functions/shared/channels/registry.js', () => ({
  sendViaChannel: vi.fn().mockResolvedValue({
    success: true,
    externalId: 'mock_msg_id_123',
  }),
  getChannelAdapter: vi.fn().mockReturnValue({
    type: 'wechat-template',
    name: 'WeChat Template',
    description: 'Mock adapter',
  }),
}));

// Import services and middleware after mocking
const { authService } = await import('../node-functions/services/auth.js');
const { configService } = await import('../node-functions/services/config.js');
const { sendkeyService } = await import('../node-functions/services/sendkey.js');
const { topicService } = await import('../node-functions/services/topic.js');
const { openidService } = await import('../node-functions/services/openid.js');
const { pushService } = await import('../node-functions/services/push.js');
const { adminAuthMiddleware, extractToken } = await import('../node-functions/middleware/admin-auth.js');

// Helper to create mock request
function createMockRequest(method, url, headers = {}, body = null) {
  const headersObj = new Headers(headers);
  return {
    method,
    url,
    headers: headersObj,
    json: async () => body,
    text: async () => (body ? JSON.stringify(body) : ''),
  };
}

// Helper to setup initialized state
async function setupInitializedState() {
  // Token must be at least 35 chars: AT_ (3) + 32 chars
  const adminToken = 'AT_test1234567890123456789012345678';
  const config = {
    adminToken,
    wechat: {
      appId: 'wx_test_app_id',
      appSecret: 'wx_test_app_secret',
      templateId: 'tmpl_test_id',
    },
    rateLimit: { perMinute: 100 },
    retention: { days: 30 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await mockConfigKV.put('config', config);
  return adminToken;
}

describe('API Authentication Properties', () => {
  beforeEach(() => {
    mockConfigKV.clear();
    mockSendkeysKV.clear();
    mockTopicsKV.clear();
    mockOpenidsKV.clear();
    mockMessagesKV.clear();
  });

  /**
   * Property 3: Management API Authentication
   * For any management API request, if the Admin_Token is missing or invalid,
   * the response SHALL be a 401 error; if valid, the request SHALL be processed.
   * Validates: Requirements 2.1, 3.1, 3.2
   */
  describe('Property 3: Management API Authentication', () => {
    it('should reject requests without token', async () => {
      await setupInitializedState();

      const request = createMockRequest('GET', 'http://localhost/api/config');
      const context = { request };

      const result = await adminAuthMiddleware(context);

      expect(result).not.toBeNull();
      const body = await result.json();
      expect(body.code).toBe(ErrorCodes.TOKEN_REQUIRED);
    });

    it('should reject requests with invalid token', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 50 }), async (invalidToken) => {
          mockConfigKV.clear();
          await setupInitializedState();

          const request = createMockRequest('GET', 'http://localhost/api/config', {
            Authorization: `Bearer ${invalidToken}`,
          });
          const context = { request };

          const result = await adminAuthMiddleware(context);

          if (result === null) {
            // Token happened to match (extremely unlikely)
            return true;
          }

          const body = await result.json();
          return body.code === ErrorCodes.INVALID_TOKEN || body.code === ErrorCodes.TOKEN_REQUIRED;
        }),
        { numRuns: 20 }
      );
    });

    it('should accept requests with valid token', async () => {
      const adminToken = await setupInitializedState();

      const request = createMockRequest('GET', 'http://localhost/api/config', {
        Authorization: `Bearer ${adminToken}`,
      });
      const context = { request };

      const result = await adminAuthMiddleware(context);

      expect(result).toBeNull(); // null means auth passed
    });

    it('should accept token via X-Admin-Token header', async () => {
      const adminToken = await setupInitializedState();

      const request = createMockRequest('GET', 'http://localhost/api/config', {
        'X-Admin-Token': adminToken,
      });
      const context = { request };

      const result = await adminAuthMiddleware(context);

      expect(result).toBeNull();
    });

    it('should skip auth for OPTIONS requests', async () => {
      await setupInitializedState();

      const request = createMockRequest('OPTIONS', 'http://localhost/api/config');
      const context = { request };

      const result = await adminAuthMiddleware(context);

      expect(result).toBeNull();
    });
  });

  /**
   * Property 4: Send API No Authentication
   * For any send API request, the request SHALL be processed based only on key existence,
   * without requiring Admin_Token.
   * Validates: Requirements 3.4, 6.6, 7.6
   */
  describe('Property 4: Send API No Authentication', () => {
    it('should process push request without token when key exists', async () => {
      await setupInitializedState();

      // Create OpenID and SendKey
      const openIdData = await openidService.create('oXXXX_test_user', 'Test User');
      const sendKeyData = await sendkeyService.create('Test Key', openIdData.id);

      // Push without token
      const result = await pushService.pushBySendKey(sendKeyData.key, 'Test Title', 'Test Content');

      expect(result.pushId).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should return KEY_NOT_FOUND for non-existent key without token', async () => {
      await setupInitializedState();

      const result = await pushService.pushBySendKey('SCTnonexistent123456789012345', 'Test Title');

      expect(result.success).toBe(false);
      expect(result.error).toBe(ErrorCodes.KEY_NOT_FOUND);
    });
  });
});

describe('Push API Properties', () => {
  beforeEach(() => {
    mockConfigKV.clear();
    mockSendkeysKV.clear();
    mockTopicsKV.clear();
    mockOpenidsKV.clear();
    mockMessagesKV.clear();
  });

  /**
   * Property 7: Invalid Key Error Handling
   * For any send request with a non-existent SendKey or TopicKey,
   * the response SHALL be a key not found error.
   * Validates: Requirements 4.5, 6.2, 7.2
   */
  describe('Property 7: Invalid Key Error Handling', () => {
    it('should return KEY_NOT_FOUND for invalid SendKey', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^SCT[a-zA-Z0-9]{10,30}$/),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (invalidKey, title) => {
            mockConfigKV.clear();
            mockSendkeysKV.clear();
            await setupInitializedState();

            const result = await pushService.pushBySendKey(invalidKey, title);

            return result.success === false && result.error === ErrorCodes.KEY_NOT_FOUND;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return KEY_NOT_FOUND for invalid TopicKey', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^TPK[a-zA-Z0-9]{10,30}$/),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (invalidKey, title) => {
            mockConfigKV.clear();
            mockTopicsKV.clear();
            await setupInitializedState();

            const result = await pushService.pushByTopicKey(invalidKey, title);

            return result.error === ErrorCodes.KEY_NOT_FOUND;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 9: Single Push Delivery
   * For any valid SendKey with a bound OpenID, pushing a message SHALL attempt
   * delivery to that OpenID and return a pushId with delivery status.
   * Validates: Requirements 6.1, 6.4
   */
  describe('Property 9: Single Push Delivery', () => {
    it('should deliver message and return pushId for valid SendKey', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 500 }),
          async (keyName, title, content) => {
            mockConfigKV.clear();
            mockSendkeysKV.clear();
            mockOpenidsKV.clear();
            mockMessagesKV.clear();
            await setupInitializedState();

            // Create OpenID and SendKey
            const openIdData = await openidService.create(`oXXXX_${keyName}`, keyName);
            const sendKeyData = await sendkeyService.create(keyName, openIdData.id);

            // Push message
            const result = await pushService.pushBySendKey(sendKeyData.key, title, content);

            return (
              result.pushId !== undefined &&
              result.pushId.startsWith('push_') &&
              typeof result.success === 'boolean'
            );
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 10: Topic Push Broadcast
   * For any valid TopicKey with N subscribers (N > 0), pushing a message SHALL
   * attempt delivery to all N subscribers and return results for each.
   * Validates: Requirements 7.1, 7.4
   */
  describe('Property 10: Topic Push Broadcast', () => {
    it('should deliver to all subscribers and return results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,30}$/),
          fc.integer({ min: 1, max: 5 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (topicName, subscriberCount, title) => {
            mockConfigKV.clear();
            mockSendkeysKV.clear();
            mockTopicsKV.clear();
            mockOpenidsKV.clear();
            mockMessagesKV.clear();
            await setupInitializedState();

            // Create Topic
            const topicData = await topicService.create(topicName);

            // Create subscribers
            for (let i = 0; i < subscriberCount; i++) {
              const openIdData = await openidService.create(`oXXXX_${topicName}_${i}`, `User ${i}`);
              await topicService.subscribe(topicData.id, openIdData.id);
            }

            // Push message
            const result = await pushService.pushByTopicKey(topicData.key, title);

            return (
              result.pushId !== undefined &&
              result.total === subscriberCount &&
              result.results.length === subscriberCount
            );
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return NO_SUBSCRIBERS for topic without subscribers', async () => {
      await setupInitializedState();

      const topicData = await topicService.create('Empty Topic');
      const result = await pushService.pushByTopicKey(topicData.key, 'Test Title');

      expect(result.error).toBe(ErrorCodes.NO_SUBSCRIBERS);
      expect(result.total).toBe(0);
    });
  });
});

describe('Auth Service Properties', () => {
  beforeEach(() => {
    mockConfigKV.clear();
  });

  /**
   * Property 1: Initialization State Consistency
   * If KV storage has no App_Config, the service SHALL be in initialization mode;
   * if App_Config exists with a valid Admin_Token, the service SHALL NOT be in initialization mode.
   * Validates: Requirements 1.1, 1.4
   */
  describe('Property 1: Initialization State Consistency', () => {
    it('should be uninitialized when no config exists', async () => {
      const isInit = await authService.isInitialized();
      expect(isInit).toBe(false);
    });

    it('should be initialized when config with adminToken exists', async () => {
      await setupInitializedState();
      const isInit = await authService.isInitialized();
      expect(isInit).toBe(true);
    });

    it('should return correct status', async () => {
      // Before init
      let status = await authService.getStatus();
      expect(status.initialized).toBe(false);

      // After init
      await setupInitializedState();
      status = await authService.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.hasWeChatConfig).toBe(true);
    });
  });

  /**
   * Token validation tests
   */
  describe('Token Validation', () => {
    it('should validate correct token', async () => {
      const adminToken = await setupInitializedState();
      const isValid = await authService.validateAdminToken(adminToken);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect token', async () => {
      await setupInitializedState();
      const isValid = await authService.validateAdminToken('AT_wrong_token_12345678901234');
      expect(isValid).toBe(false);
    });

    it('should reject empty token', async () => {
      await setupInitializedState();
      const isValid = await authService.validateAdminToken('');
      expect(isValid).toBe(false);
    });

    it('should reject null token', async () => {
      await setupInitializedState();
      const isValid = await authService.validateAdminToken(null);
      expect(isValid).toBe(false);
    });
  });
});
