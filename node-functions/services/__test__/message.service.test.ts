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

function createMockKV() {
  return {
    get: vi.fn(async (key: string) => {
      if (!store.has(key)) {
        return null;
      }
      return cloneValue(store.get(key));
    }),
    getMany: vi.fn(async (keys: string[]) => Object.fromEntries(
      keys.map((key) => [key, store.has(key) ? cloneValue(store.get(key)) : null])
    )),
    put: vi.fn(async (key: string, value: unknown) => {
      store.set(key, cloneValue(value));
    }),
    putMany: vi.fn(async (entries: Array<{ key: string; value: unknown }>) => {
      entries.forEach(({ key, value }) => {
        store.set(key, cloneValue(value));
      });
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    deleteMany: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => store.delete(key));
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
  };
}

vi.mock('../../shared/kv-client.js', () => ({
  messagesKV: createMockKV(),
  appsKV: createMockKV(),
  channelsKV: createMockKV(),
  openidsKV: createMockKV(),
  configKV: createMockKV(),
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
    expect(store.get(KVKeys.MESSAGE_LIST_HEAD)).toEqual(['msg_new', 'push_old']);
    expect(store.get(KVKeys.MESSAGE_COUNT)).toBe(2);
    expect(store.get(KVKeys.MESSAGE_APP('app_alpha'))).toEqual(['push_old']);
    expect(store.get(KVKeys.MESSAGE_APP_HEAD('app_alpha'))).toEqual(['push_old']);
    expect(store.get(KVKeys.MESSAGE_APP_COUNT('app_alpha'))).toBe(1);
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
    expect(store.get(KVKeys.MESSAGE_SUMMARY(message.id))).toMatchObject({
      id: 'push_live',
      title: 'default title',
      previewText: 'default title',
    });
    expect(store.get(KVKeys.MESSAGE_LIST)).toEqual(['push_live']);
    expect(store.get(KVKeys.MESSAGE_LIST_HEAD)).toEqual(['push_live']);
    expect(store.get(KVKeys.MESSAGE_COUNT)).toBe(1);
    expect(store.get(KVKeys.MESSAGE_APP('app_live'))).toEqual(['push_live']);
    expect(store.get(KVKeys.MESSAGE_APP_HEAD('app_live'))).toEqual(['push_live']);
    expect(store.get(KVKeys.MESSAGE_APP_COUNT('app_live'))).toBe(1);
  });

  it('reports the full indexed total in stats even when only the latest page is scanned', async () => {
    const messages = Array.from({ length: 25 }, (_, index) => createMessage({
      id: `push_${index}`,
      channelId: `ch_${index % 2}`,
      createdAt: `2026-03-15T${String(index % 10).padStart(2, '0')}:00:00.000Z`,
    }));

    for (const message of messages) {
      store.set(KVKeys.MESSAGE(message.id), cloneValue(message));
    }

    const stats = await messageService.getStats();

    expect(stats.total).toBe(25);
    expect(store.get(KVKeys.MESSAGE_INDEX_META)).toMatchObject({
      version: 1,
      total: 25,
    });
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
    expect(store.has(KVKeys.MESSAGE_SUMMARY(message.id))).toBe(false);
    expect(store.has(KVKeys.MESSAGE_LIST)).toBe(false);
    expect(store.has(KVKeys.MESSAGE_LIST_HEAD)).toBe(false);
    expect(store.has(KVKeys.MESSAGE_COUNT)).toBe(false);
    expect(store.has(KVKeys.MESSAGE_APP('app_delete'))).toBe(false);
    expect(store.has(KVKeys.MESSAGE_APP_HEAD('app_delete'))).toBe(false);
    expect(store.has(KVKeys.MESSAGE_APP_COUNT('app_delete'))).toBe(false);
  });

  it('uses the head index for first page reads without loading the full global list', async () => {
    const headIds = ['msg_3', 'msg_2', 'msg_1'];
    store.set(KVKeys.MESSAGE_LIST_HEAD, cloneValue(headIds));
    store.set(KVKeys.MESSAGE_COUNT, 3);
    store.set(KVKeys.MESSAGE_SUMMARY('msg_3'), {
      id: 'msg_3',
      direction: 'outbound',
      type: 'push',
      channelId: 'ch_default',
      title: 'third',
      previewText: 'third',
      createdAt: '2026-03-15T08:00:00.000Z',
      delivery: { total: 0, success: 0, failed: 0, state: 'failed' },
    });
    store.set(KVKeys.MESSAGE_SUMMARY('msg_2'), {
      id: 'msg_2',
      direction: 'outbound',
      type: 'push',
      channelId: 'ch_default',
      title: 'second',
      previewText: 'second',
      createdAt: '2026-03-15T08:00:00.000Z',
      delivery: { total: 0, success: 0, failed: 0, state: 'failed' },
    });
    store.set(KVKeys.MESSAGE_SUMMARY('msg_1'), {
      id: 'msg_1',
      direction: 'outbound',
      type: 'push',
      channelId: 'ch_default',
      title: 'first',
      previewText: 'first',
      createdAt: '2026-03-15T08:00:00.000Z',
      delivery: { total: 0, success: 0, failed: 0, state: 'failed' },
    });

    const result = await messageService.listSummaries({ page: 1, pageSize: 2 }, 'https://example.com');

    expect(result.pagination.total).toBe(3);
    expect(result.items.map((message) => message.id)).toEqual(['msg_3', 'msg_2']);
    expect(store.has(KVKeys.MESSAGE_LIST)).toBe(false);
  });
});
