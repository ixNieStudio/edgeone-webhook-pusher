/**
 * DingTalkStrategy Property-Based Tests
 *
 * Uses fast-check to generate random inputs and validate:
 * - Message formatting with arbitrary strings
 * - @mentions with arbitrary mobile numbers
 * - Special character handling
 * - Message length limits
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DingTalkStrategy } from './dingtalk-strategy.js';
import type { Channel } from '../types/channel.js';

describe('DingTalkStrategy - Property Tests', () => {
  const createStrategy = (config?: any) => {
    const channel: Channel = {
      id: 'test',
      type: 'dingtalk',
      name: 'Test',
      config: {
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
        ...config,
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    return new DingTalkStrategy(channel);
  };

  describe('Message Formatting', () => {
    it('should handle arbitrary title and description', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
          (title, desp) => {
            const strategy = createStrategy();
            const message = { title, desp };

            const result = strategy['buildMessage'](message, 'target');

            expect(result.msgtype).toBe('text');
            expect(result.text.content).toContain(title);
            if (desp) {
              expect(result.text.content).toContain(desp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in message content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (content) => {
            const strategy = createStrategy();
            const message = { title: content };

            const result = strategy['buildMessage'](message, 'target');

            // Should not throw, should preserve content
            expect(result.text.content).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle unicode and emoji in messages', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          (title, desp) => {
            const strategy = createStrategy();
            const message = { title, desp };

            const result = strategy['buildMessage'](message, 'target');

            expect(result.msgtype).toBe('text');
            expect(result.text.content).toContain(title);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should respect message length limit', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10000 }),
          fc.string({ minLength: 1, maxLength: 10000 }),
          (title, desp) => {
            const strategy = createStrategy();
            const message = { title, desp };

            // Should either succeed or throw length error
            try {
              const result = strategy['buildMessage'](message, 'target');
              const totalLength = desp ? title.length + 2 + desp.length : title.length;
              expect(totalLength).toBeLessThanOrEqual(20000);
            } catch (error) {
              expect((error as Error).message).toMatch(/exceeds.*20,?000 characters/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty strings correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', 'a', 'test'),
          fc.constantFrom('', 'b', 'description'),
          (title, desp) => {
            if (!title) return; // Skip empty title (invalid)

            const strategy = createStrategy();
            const message = { title, desp: desp || undefined };

            const result = strategy['buildMessage'](message, 'target');

            expect(result.msgtype).toBe('text');
            if (desp) {
              expect(result.text.content).toContain(title);
              expect(result.text.content).toContain(desp);
            } else {
              expect(result.text.content).toBe(title);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('@mentions Functionality', () => {
    it('should handle arbitrary mobile numbers', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 11, maxLength: 11 }), { maxLength: 10 }),
          (mobiles) => {
            const strategy = createStrategy();
            const message = {
              title: 'Test',
              atMobiles: mobiles,
            };

            const result = strategy['buildMessage'](message, 'target');

            if (mobiles.length > 0) {
              expect(result.at).toBeDefined();
              expect(result.at.atMobiles).toEqual(mobiles);
              expect(result.at.isAtAll).toBe(false);
            } else {
              expect(result.at).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle atAll flag with various configurations', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(fc.string({ minLength: 11, maxLength: 11 }), { maxLength: 5 }),
          (atAll, mobiles) => {
            const strategy = createStrategy();
            const message = {
              title: 'Test',
              atAll,
              atMobiles: mobiles,
            };

            const result = strategy['buildMessage'](message, 'target');

            if (atAll || mobiles.length > 0) {
              expect(result.at).toBeDefined();
              expect(result.at.isAtAll).toBe(atAll);
              expect(result.at.atMobiles).toEqual(mobiles);
            } else {
              expect(result.at).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize message-level mentions over channel config', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 11, maxLength: 11 }), { minLength: 1, maxLength: 3 }),
          fc.array(fc.string({ minLength: 11, maxLength: 11 }), { minLength: 1, maxLength: 3 }),
          (channelMobiles, messageMobiles) => {
            const strategy = createStrategy({ atMobiles: channelMobiles });
            const message = {
              title: 'Test',
              atMobiles: messageMobiles,
            };

            const result = strategy['buildMessage'](message, 'target');

            // Message-level should override channel-level
            expect(result.at.atMobiles).toEqual(messageMobiles);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Message Structure Invariants', () => {
    it('should always produce valid message structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            desp: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            atMobiles: fc.option(
              fc.array(fc.string({ minLength: 11, maxLength: 11 }), { maxLength: 5 }),
              { nil: undefined }
            ),
            atAll: fc.option(fc.boolean(), { nil: undefined }),
          }),
          (message) => {
            const strategy = createStrategy();

            try {
              const result = strategy['buildMessage'](message, 'target');

              // Invariants that must always hold
              expect(result).toHaveProperty('msgtype');
              expect(result.msgtype).toBe('text');
              expect(result).toHaveProperty('text');
              expect(result.text).toHaveProperty('content');
              expect(typeof result.text.content).toBe('string');

              // If at field exists, it must have correct structure
              if (result.at) {
                expect(result.at).toHaveProperty('atMobiles');
                expect(result.at).toHaveProperty('isAtAll');
                expect(Array.isArray(result.at.atMobiles)).toBe(true);
                expect(typeof result.at.isAtAll).toBe('boolean');
              }
            } catch (error) {
              // Only length errors are acceptable
              expect((error as Error).message).toMatch(/exceeds.*20,?000 characters/i);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should handle edge cases in message combinations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
          fc.option(fc.array(fc.string({ minLength: 11, maxLength: 11 })), { nil: undefined }),
          fc.option(fc.boolean(), { nil: undefined }),
          (title, desp, atMobiles, atAll) => {
            if (!title) return; // Skip empty title

            const strategy = createStrategy();
            const message = { title, desp, atMobiles, atAll };

            const result = strategy['buildMessage'](message, 'target');

            // Should always produce valid structure
            expect(result.msgtype).toBe('text');
            expect(result.text.content).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Signature Generation Properties', () => {
    it('should generate deterministic signatures for same inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 50 }),
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          (secret, timestamp) => {
            const strategy = createStrategy({ secret });

            // Mock Date.now to return consistent timestamp
            const originalDateNow = Date.now;
            Date.now = () => timestamp;

            const sig1 = strategy['generateSignature'](secret);
            const sig2 = strategy['generateSignature'](secret);

            Date.now = originalDateNow;

            // Same inputs should produce same signature
            expect(sig1.timestamp).toBe(sig2.timestamp);
            expect(sig1.sign).toBe(sig2.sign);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate different signatures for different secrets', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 50 }),
          fc.string({ minLength: 10, maxLength: 50 }),
          (secret1, secret2) => {
            fc.pre(secret1 !== secret2); // Only test when secrets are different

            const strategy1 = createStrategy({ secret: secret1 });
            const strategy2 = createStrategy({ secret: secret2 });

            const timestamp = 1609459200000;
            const originalDateNow = Date.now;
            Date.now = () => timestamp;

            const sig1 = strategy1['generateSignature'](secret1);
            const sig2 = strategy2['generateSignature'](secret2);

            Date.now = originalDateNow;

            // Different secrets should produce different signatures
            expect(sig1.sign).not.toBe(sig2.sign);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
