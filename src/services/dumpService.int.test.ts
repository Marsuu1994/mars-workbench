import {beforeEach, describe, expect, it} from 'vitest';
import {DUMP_PAGE_SIZE} from '@/utils/dump';
import {newUserId} from '../../test/factories';
import {
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
