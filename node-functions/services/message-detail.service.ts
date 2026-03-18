import { randomBytes } from 'crypto';
import { messagesKV } from '../shared/kv-client.js';
import type { MessageDetailSnapshot, PublicMessageDetail } from '../types/message.js';
import { KVKeys } from '../types/constants.js';
import { richContentService } from './rich-content.service.js';

function generateDetailToken(): string {
  return `md_${randomBytes(18).toString('base64url')}`;
}

function resolveBaseUrl(preferredBaseUrl?: string): string {
  const envBaseUrl = process.env.KV_BASE_URL?.trim();
  const baseUrl = envBaseUrl || preferredBaseUrl || '';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

class MessageDetailService {
  async createSnapshot(
    input: Omit<MessageDetailSnapshot, 'token'>,
    preferredBaseUrl?: string
  ): Promise<{ token: string; detailPageUrl: string }> {
    const token = generateDetailToken();
    const snapshot: MessageDetailSnapshot = {
      token,
      ...input,
    };

    await messagesKV.put(KVKeys.MESSAGE_DETAIL(token), snapshot);

    const baseUrl = resolveBaseUrl(preferredBaseUrl);
    return {
      token,
      detailPageUrl: `${baseUrl}/open/messages/${token}`,
    };
  }

  async getPublicDetail(token: string): Promise<PublicMessageDetail | null> {
    const snapshot = await messagesKV.get<MessageDetailSnapshot>(KVKeys.MESSAGE_DETAIL(token));
    if (!snapshot) {
      return null;
    }

    return {
      token: snapshot.token,
      title: snapshot.title,
      summary: snapshot.summary,
      body: snapshot.body,
      contentFormat: snapshot.contentFormat,
      renderedHtml: await richContentService.render(snapshot.body, snapshot.contentFormat),
      originalUrl: snapshot.originalUrl,
      appName: snapshot.appName,
      createdAt: snapshot.createdAt,
    };
  }
}

export const messageDetailService = new MessageDetailService();
