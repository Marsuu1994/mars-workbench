import {randomUUID} from 'node:crypto';
import {beforeEach, describe, expect, it} from 'vitest';
import {DUMP_PAGE_SIZE} from '@/utils/dump';
import {newUserId} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {
  captureDumpEntries,
  captureDumpEntry,
  countDumpFeed,
  fetchDumpFeedPage,
} from './dumpService';

let userId: string;

beforeEach(() => {
  userId = newUserId();
});

describe('the dump feed', () => {
  it('pages newest first and ends with no cursor', async () => {
    for (let index = 1; index <= DUMP_PAGE_SIZE + 1; index++) {
      await captureDumpEntry(userId, `Thought ${index}`);
    }

    const firstPage = await fetchDumpFeedPage(userId, undefined);
    if ('error' in firstPage) throw new Error(firstPage.error);
    expect(firstPage.entries).toHaveLength(DUMP_PAGE_SIZE);
    expect(firstPage.entries[0].content).toBe(`Thought ${DUMP_PAGE_SIZE + 1}`);
    expect(firstPage.nextCursor).not.toBeNull();

    const lastPage = await fetchDumpFeedPage(userId, firstPage.nextCursor!);
    expect(lastPage).toMatchObject({
      entries: [{content: 'Thought 1'}],
      nextCursor: null,
    });
    expect(await countDumpFeed(userId)).toBe(DUMP_PAGE_SIZE + 1);
  });

  it('answers a cursor that does not decode with an error', async () => {
    expect(await fetchDumpFeedPage(userId, 'not-a-cursor')).toEqual({
      error: 'invalidCursor',
    });
  });
});

describe('capturing entries from the iOS app', () => {
  it('keeps the moment each was written down, and stores one from the future as now', async () => {
    freezeTime(MOMENTS.WEDNESDAY_NOON);
    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);
    const later = new Date(now.getTime() + 3600000);
    const earlierId = randomUUID();
    const laterId = randomUUID();

    const result = await captureDumpEntries(userId, [
      {id: earlierId, content: 'Offline thought', capturedAt: earlier},
      {id: laterId, content: 'Fast clock', capturedAt: later},
    ]);

    expect(result).toEqual({acceptedIds: [earlierId, laterId]});
    const page = await fetchDumpFeedPage(userId, undefined);
    expect(page).toMatchObject({
      entries: [
        {id: laterId, createdAt: now},
        {id: earlierId, createdAt: earlier},
      ],
    });
  });

  it('writes an entry sent twice once', async () => {
    const entry = {id: randomUUID(), content: 'Once', capturedAt: new Date()};

    await captureDumpEntries(userId, [entry]);
    const again = await captureDumpEntries(userId, [entry]);

    expect(again).toEqual({acceptedIds: [entry.id]});
    expect(await countDumpFeed(userId)).toBe(1);
  });
});
