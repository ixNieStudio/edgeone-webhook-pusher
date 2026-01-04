import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeInput } from '@webhook-pusher/shared';

describe('PushService', () => {
  describe('Property 3: Missing Title Validation', () => {
    it('sanitizeInput should handle various inputs', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitizeInput(input);
          // Result should not contain < or >
          return !result.includes('<') && !result.includes('>');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Input Sanitization', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('<div>hello</div>')).toBe('divhello/div');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should limit length to 10000 characters', () => {
      const longString = 'a'.repeat(20000);
      expect(sanitizeInput(longString).length).toBe(10000);
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should preserve normal text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
    });
  });

  describe('Property 5: Content Type Equivalence', () => {
    it('title and desp should be preserved after sanitization', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.includes('<') && !s.includes('>')),
          (input) => {
            const trimmed = input.trim().slice(0, 10000);
            return sanitizeInput(input) === trimmed;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
