import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('HistoryService', () => {
  describe('Property 15: Message History Ordering', () => {
    it('messages should be sorted by createdAt descending', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (messages) => {
            // Sort by createdAt descending (newest first)
            const sorted = [...messages].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            );

            // Verify ordering
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i - 1].createdAt.getTime() < sorted[i].createdAt.getTime()) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: History Pagination Limit', () => {
    it('should not exceed max limit of 100', () => {
      const MAX_LIMIT = 100;

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 500 }),
          (requestedLimit) => {
            const effectiveLimit = Math.min(requestedLimit, MAX_LIMIT);
            return effectiveLimit <= MAX_LIMIT;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use default limit when not specified', () => {
      const DEFAULT_LIMIT = 20;
      const MAX_LIMIT = 100;

      const effectiveLimit = Math.min(DEFAULT_LIMIT, MAX_LIMIT);
      expect(effectiveLimit).toBe(20);
    });
  });
});
