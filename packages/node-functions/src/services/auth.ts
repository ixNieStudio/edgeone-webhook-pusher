import type { UserData } from '@webhook-pusher/shared';
import { generateSendKey, generateId, now } from '@webhook-pusher/shared';
import { usersKV } from './kv-client.js';

export class AuthService {
  /**
   * Validate SendKey and return user data
   */
  async validateSendKey(sendKey: string): Promise<UserData | null> {
    // Look up userId by SendKey index
    const userId = await usersKV.get<string>(`sk_${sendKey}`);
    if (!userId) return null;

    // Get user data
    const user = await usersKV.get<UserData>(userId);
    if (!user || user.sendKey !== sendKey) return null;

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserData | null> {
    return usersKV.get<UserData>(userId);
  }

  /**
   * Create a new user with SendKey
   */
  async createUser(): Promise<UserData> {
    const id = generateId();
    const sendKey = generateSendKey();
    const timestamp = now();

    const user: UserData = {
      id,
      sendKey,
      createdAt: timestamp,
      rateLimit: {
        count: 0,
        resetAt: new Date(Date.now() + 60000).toISOString(),
      },
    };

    // Save user data
    await usersKV.put(id, user);
    // Create SendKey index
    await usersKV.put(`sk_${sendKey}`, id);

    return user;
  }

  /**
   * Regenerate SendKey for user
   */
  async regenerateSendKey(userId: string): Promise<string | null> {
    const user = await usersKV.get<UserData>(userId);
    if (!user) return null;

    const oldSendKey = user.sendKey;
    const newSendKey = generateSendKey();

    // Update user with new SendKey
    user.sendKey = newSendKey;
    await usersKV.put(userId, user);

    // Delete old index, create new one
    await usersKV.delete(`sk_${oldSendKey}`);
    await usersKV.put(`sk_${newSendKey}`, userId);

    return newSendKey;
  }

  /**
   * Update rate limit for user
   */
  async updateRateLimit(
    userId: string,
    rateLimit: { count: number; resetAt: string }
  ): Promise<void> {
    const user = await usersKV.get<UserData>(userId);
    if (!user) return;

    user.rateLimit = rateLimit;
    await usersKV.put(userId, user);
  }
}

export const authService = new AuthService();
