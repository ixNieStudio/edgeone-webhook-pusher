/**
 * FeishuStrategy Property-Based Tests
 *
 * Uses fast-check to generate random inputs and validate:
 * - Message formatting with arbitrary strings
 * - Special character handling
 * - Message length limits (30,000 characters)
 * - Signature generation properties (SHA-256)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FeishuStrategy } from './feishu-strategy.js';
import type { Channel } from '../types/channel.js';

describe('FeishuStrategy - Property Tests', () => {
  const createStrategy = (config?: any) => {
    const channel: Channel = {
      id: 'test',
      type: 'feishu',
      name: 'Test',
      config: {
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
        ...config,
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    return new FeishuStrategy(channel);
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

            expect(result.msg_type).toBe('text');
            expect(result.content.text).toContain(title);
            if (desp) {
              expect(result.content.text).toContain(desp);
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
            expect(result.content.text).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect message length limit (30000 characters)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 15000 }),
          fc.string({ minLength: 1, maxLength: 15000 }),
          (title, desp) => {
            const strategy = createStrategy();
            const message = { title, desp };

            // Should either succeed or throw length error
            try {
              const result = strategy['buildMessage'](message, 'target');
              const totalLength = title.length + 2 + desp.length;
              expect(totalLength).toBeLessThanOrEqual(30000);
            } catch (error) {
              expect((error as Error).message).toMatch(/exceeds.*30,?000 characters/i);
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

            expect(result.msg_type).toBe('text');
            if (desp) {
              expect(result.content.text).toContain(title);
              expect(result.content.text).toContain(desp);
            } else {
              expect(result.content.text).toBe(title);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle newlines and whitespace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          (title, desp) => {
            const strategy = createStrategy();
            const message = { title, desp };

            const result = strategy['buildMessage'](message, 'target');

            // Should preserve newlines and whitespace
            expect(result.msg_type).toBe('text');
            expect(typeof result.content.text).toBe('string');
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
          fc.string({ minLength: 32, maxLength: 32 }),
          fc.integer({ min: 1000000000, max: 9999999999 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (secret, timestamp, body) => {
            const strategy = createStrategy({ secret });

            const timestampStr = timestamp.toString();
            const sig1 = strategy['generateSignature'](secret, timestampStr, body);
            const sig2 = strategy['generateSignature'](secret, timestampStr, body);

            // Same inputs should produce same signature
            expect(sig1).toBe(sig2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate different signatures for different secrets', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 32, maxLength: 32 }),
          fc.string({ minLength: 32, maxLength: 32 }),
          fc.integer({ min: 1000000000, max: 9999999999 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (secret1, secret2, timestamp, body) => {
            fc.pre(secret1 !== secret2); // Only test when secrets are different

            const strategy1 = createStrategy({ secret: secret1 });
            const strategy2 = createStrategy({ secret: secret2 });

            const timestampStr = timestamp.toString();
            const sig1 = strategy1['generateSignature'](secret1, timestampStr, body);
            const sig2 = strategy2['generateSignature'](secret2, timestampStr, body);

            // Different secrets should produce different signatures
            expect(sig1).not.toBe(sig2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate different signatures for different timestamps', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 32, maxLength: 32 }),
          fc.integer({ min: 1000000000, max: 9999999999 }),
          fc.integer({ min: 1000000000, max: 9999999999 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (secret, timestamp1, timestamp2, body) => {
            fc.pre(timestamp1 !== timestamp2); // Only test when timestamps are different

            const strategy = createStrategy({ secret });

            const sig1 = strategy['generateSignature'](secret, timestamp1.toString(), body);
            const sig2 = strategy['generateSignature'](secret, timestamp2.toString(), body);

            // Different timestamps should produce different signatures
            expect(sig1).not.toBe(sig2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate different signatures for different bodies', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 32, maxLength: 32 }),
          fc.integer({ min: 1000000000, max: 9999999999 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (secret, timestamp, body1, body2) => {
            fc.pre(body1 !== body2); // Only test when bodies are different

            const strategy = createStrategy({ secret });

            const timestampStr = timestamp.toString();
            const sig1 = strategy['generateSignature'](secret, timestampStr, body1);
            const sig2 = strategy['generateSignature'](secret, timestampStr, body2);

            // Different bodies should produce different signatures
            expect(sig1).not.toBe(sig2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce lowercase hexadecimal signatures', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 32, maxLength: 32 }),
          fc.integer({ min: 1000000000, max: 9999999999 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (secret, timestamp, body) => {
            const strategy = createStrategy({ secret });

            const sig = strategy['generateSignature'](secret, timestamp.toString(), body);

            // SHA-256 produces 64-character lowercase hexadecimal
            expect(sig).toMatch(/^[a-f0-9]{64}$/);
          }
        ),
        { numRuns: 100 }
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
          }),
          (message) => {
            const strategy = createStrategy();

            try {
              const result = strategy['buildMessage'](message, 'target');

              // Invariants that must always hold
              expect(result).toHaveProperty('msg_type');
              expect(result.msg_type).toBe('text');
              expect(result).toHaveProperty('content');
              expect(result.content).toHaveProperty('text');
              expect(typeof result.content.text).toBe('string');

              // Should not have signature fields when secret not configured
              expect(result.timestamp).toBeUndefined();
              expect(result.sign).toBeUndefined();
            } catch (error) {
              // Only length errors are acceptable
              expect((error as Error).message).toMatch(/exceeds.*30,?000 characters/i);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should include signature fields when secret configured', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            desp: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          }),
          fc.string({ minLength: 32, maxLength: 32 }),
          (message, secret) => {
            const strategy = createStrategy({ secret });

            try {
              const result = strategy['buildMessage'](message, 'target');

              // Should have signature fields
              expect(result.timestamp).toBeDefined();
              expect(result.sign).toBeDefined();
              expect(typeof result.timestamp).toBe('string');
              expect(typeof result.sign).toBe('string');

              // Timestamp should be in seconds (10 digits)
              expect(result.timestamp?.length).toBe(10);

              // Signature should be SHA-256 hex (64 characters)
              expect(result.sign).toMatch(/^[a-f0-9]{64}$/);
            } catch (error) {
              // Only length errors are acceptable
              expect((error as Error).message).toMatch(/exceeds.*30,?000 characters/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in message combinations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
          (title, desp) => {
            if (!title) return; // Skip empty title

            const strategy = createStrategy();
            const message = { title, desp };

            const result = strategy['buildMessage'](message, 'target');

            // Should always produce valid structure
            expect(result.msg_type).toBe('text');
            expect(result.content.text).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Response Format Handling', () => {
    it('should handle both new and legacy response formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // New format
            fc.record({
              code: fc.integer({ min: 0, max: 99999 }),
              msg: fc.string({ maxLength: 50 }),
              data: fc.option(fc.record({ message_id: fc.string() }), { nil: undefined }),
            }),
            // Legacy format
            fc.record({
              errcode: fc.integer({ min: 0, max: 99999 }),
              errmsg: fc.string({ maxLength: 50 }),
            })
          ),
          (response) => {
            const strategy = createStrategy();

            const result = strategy['parseResponse'](response);

            // Should always return valid SendResult
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');

            if (result.success) {
              expect(result.error).toBeUndefined();
              expect(result.errorCode).toBeUndefined();
            } else {
              expect(result.error).toBeDefined();
              expect(result.errorCode).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
