import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { checkRateLimit } from '@webhook-pusher/shared';

describe('RateLimitMiddleware', () => {
  describe('Property 18: Rate Limiting Enforcement', () => {
    it('should allow requests under the limit', () => {
      const rateLimit = {
        count: 30,
        resetAt: new Date(Date.now() + 30000).toISOString(),
      };

      const result = checkRateLimit(rateLimit, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

    it('should deny requests at the limit', () => {
      const rateLimit = {
        count: 60,
        resetAt: new Date(Date.now() + 30000).toISOString(),
      };

      const result = checkRateLimit(rateLimit, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const rateLimit = {
        count: 60,
        resetAt: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      const result = checkRateLimit(rateLimit, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it('should correctly calculate remaining requests', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 59 }),
          (count) => {
            const rateLimit = {
              count,
              resetAt: new Date(Date.now() + 30000).toISOString(),
            };

            const result = checkRateLimit(rateLimit, 60);
            return result.allowed && result.remaining === 60 - count - 1;
          }
        ),
        { numRuns: 60 }
      );
    });

    it('should deny all requests when at or over limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 60, max: 100 }),
          (count) => {
            const rateLimit = {
              count,
              resetAt: new Date(Date.now() + 30000).toISOString(),
            };

            const result = checkRateLimit(rateLimit, 60);
            return !result.allowed && result.remaining === 0;
          }
        ),
        { numRuns: 40 }
      );
    });
  });
});
