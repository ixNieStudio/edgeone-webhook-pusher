import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../../types/index.js';
import { KVKeys } from '../../types/index.js';

const store = new Map<string, unknown>();

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function listKeysByPrefix(prefix = ''): string[] {
  return Array.from(store.keys())
    .filter((key) => key.startsWith(prefix))
    .sort();
}

vi.mock('../../shared/kv-client.js', () => ({
  messagesKV: {
    get: vi.fn(async (key: string) => {
      if (!store.has(key)) {
        return null;
      }
      return cloneValue(store.get(key));
    }),
    put: vi.fn(async (key: string, value: unknown) => {
      store.set(key, cloneValue(value));
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async (prefix = '', limit = 256, cursor?: string) => {
      const keys = listKeysByPrefix(prefix);
      const start = cursor ? Number(cursor) : 0;
      const sliced = keys.slice(start, start + limit);
      const nextCursor = start + sliced.length < keys.length ? String(start + sliced.length) : undefined;

      return {
        keys: sliced,
        complete: nextCursor === undefined,
        cursor: nextCursor,
      };
    }),
    listAll: vi.fn(async (prefix = '') => listKeysByPrefix(prefix)),
  },
}));

import { messageService } from '../message.service.js';

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'push_default',
    direction: 'outbound',
    type: 'push',
    channelId: 'ch_default',
    title: 'default title',
    createdAt: '2026-03-15T08:00:00.000Z',
    ...overrides,
  };
}

describe('MessageService', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('rebuilds missing indexes from stored message records before listing', async () => {
    const olderMessage = createMessage({
      id: 'push_old',
      appId: 'app_alpha',
      title: 'older message',
      createdAt: '2026-03-14T10:00:00.000Z',
    });
    const newerMessage = createMessage({
      id: 'msg_new',
      direction: 'inbound',
      type: 'text',
      channelId: 'ch_beta',
      openId: 'openid_user_1',
      title: 'newer message',
      createdAt: '2026-03-15T10:00:00.000Z',
    });

    store.set(KVKeys.MESSAGE(olderMessage.id), cloneValue(olderMessage));
    store.set(KVKeys.MESSAGE(newerMessage.id), cloneValue(newerMessage));

    const result = await messageService.list();

    expect(result.total).toBe(2);
    expect(result.messages.map((message) => message.id)).toEqual(['msg_new', 'push_old']);
    expect(store.get(KVKeys.MESSAGE_LIST)).toEqual(['msg_new', 'push_old']);
    expect(store.get(KVKeys.MESSAGE_APP('app_alpha'))).toEqual(['push_old']);
    expect(store.get(KVKeys.MESSAGE_CHANNEL('ch_beta'))).toEqual(['msg_new']);
    expect(store.get(KVKeys.MESSAGE_OPENID('openid_user_1'))).toEqual(['msg_new']);
    expect(store.get(KVKeys.MESSAGE_INDEX_META)).toMatchObject({
      version: 1,
      total: 2,
    });
  });

  it('updates message indexes while saving new records', async () => {
    const message = createMessage({
      id: 'push_live',
      appId: 'app_live',
      channelId: 'ch_live',
      openId: 'openid_live',
    });

    await messageService.saveMessage(message);

    expect(store.get(KVKeys.MESSAGE(message.id))).toEqual(message);
    expect(store.get(KVKeys.MESSAGE_LIST)).toEqual(['push_live']);
    expect(store.get(KVKeys.MESSAGE_CHANNEL('ch_live'))).toEqual(['push_live']);
    expect(store.get(KVKeys.MESSAGE_APP('app_live'))).toEqual(['push_live']);
    expect(store.get(KVKeys.MESSAGE_OPENID('openid_live'))).toEqual(['push_live']);
  });

  it('removes ids from indexes when deleting a message', async () => {
    const message = createMessage({
      id: 'push_delete',
      appId: 'app_delete',
      channelId: 'ch_delete',
      openId: 'openid_delete',
    });

    await messageService.saveMessage(message);
    const deleted = await messageService.delete(message.id);

    expect(deleted).toBe(true);
    expect(store.has(KVKeys.MESSAGE(message.id))).toBe(false);
    expect(store.has(KVKeys.MESSAGE_LIST)).toBe(false);
    expect(store.has(KVKeys.MESSAGE_CHANNEL('ch_delete'))).toBe(false);
    expect(store.has(KVKeys.MESSAGE_APP('app_delete'))).toBe(false);
    expect(store.has(KVKeys.MESSAGE_OPENID('openid_delete'))).toBe(false);
  });
});
