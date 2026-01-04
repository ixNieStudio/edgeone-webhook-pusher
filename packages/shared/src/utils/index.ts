import { randomBytes } from 'crypto';

/**
 * Generate a unique SendKey (32+ characters, URL-safe)
 */
export function generateSendKey(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Mask sensitive credential values
 */
export function maskCredential(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
}

/**
 * Mask all sensitive fields in credentials object
 */
export function maskCredentials(
  credentials: Record<string, string>,
  sensitiveFields: string[]
): Record<string, string> {
  const masked = { ...credentials };
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = maskCredential(masked[field]);
    }
  }
  return masked;
}

/**
 * Validate SendKey format (32+ chars, URL-safe)
 */
export function isValidSendKey(sendKey: string): boolean {
  if (!sendKey || sendKey.length < 32) {
    return false;
  }
  // URL-safe base64 characters only
  return /^[A-Za-z0-9_-]+$/.test(sendKey);
}

/**
 * Sanitize user input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

/**
 * Check rate limit (60 requests per minute)
 */
export function checkRateLimit(
  rateLimit: { count: number; resetAt: string },
  limit = 60
): RateLimitResult {
  const now = new Date();
  const resetAt = new Date(rateLimit.resetAt);

  // Reset if window expired
  if (now >= resetAt) {
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + 60000).toISOString(),
    };
  }

  // Check if under limit
  if (rateLimit.count < limit) {
    return {
      allowed: true,
      remaining: limit - rateLimit.count - 1,
      resetAt: rateLimit.resetAt,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: rateLimit.resetAt,
  };
}
