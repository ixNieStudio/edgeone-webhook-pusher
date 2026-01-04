import type { MessageData } from '@webhook-pusher/shared';
import { messagesKV } from './kv-client.js';

export interface HistoryQuery {
  userId: string;
  limit?: number;
  cursor?: string;
}

export interface HistoryResult {
  messages: MessageData[];
  hasMore: boolean;
  cursor?: string;
}

export class HistoryService {
  private readonly MAX_LIMIT = 100;
  private readonly DEFAULT_LIMIT = 20;

  /**
   * Get message history for a user
   */
  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const limit = Math.min(query.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);

    // Get all message keys for user
    // Note: In production, you'd want a better indexing strategy
    const allKeys = await messagesKV.list();

    // Load all messages and filter by userId
    const messages: MessageData[] = [];
    for (const key of allKeys) {
      const message = await messagesKV.get<MessageData>(key);
      if (message && message.userId === query.userId) {
        messages.push(message);
      }
    }

    // Sort by createdAt descending (newest first)
    messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const startIndex = query.cursor ? messages.findIndex((m) => m.id === query.cursor) + 1 : 0;
    const paginatedMessages = messages.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < messages.length;

    return {
      messages: paginatedMessages,
      hasMore,
      cursor: hasMore ? paginatedMessages[paginatedMessages.length - 1]?.id : undefined,
    };
  }

  /**
   * Get single message by ID
   */
  async getMessage(messageId: string): Promise<MessageData | null> {
    return messagesKV.get<MessageData>(messageId);
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const message = await this.getMessage(messageId);
    if (!message) return false;

    await messagesKV.delete(messageId);
    return true;
  }
}

export const historyService = new HistoryService();
