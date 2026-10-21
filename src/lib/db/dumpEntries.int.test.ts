import {beforeEach, describe, expect, it} from 'vitest';
import {newUserId} from '../../../test/factories';
import {
  countDumpEntries,
  createDumpEntry,
  getDumpEntriesPage,
  type DumpEntryItem,
} from './dumpEntries';

let userId: string;

beforeEach(() => {
  userId = newUserId();
});

const capture = async (count: number) => {
  const entries: DumpEntryItem[] = [];
  for (let index = 1; index <= count; index++) {
    entries.push(await createDumpEntry(userId, {content: `Thought ${index}`}));
  }
  return entries;
};

describe('the dump feed', () => {
  it('pages newest first, each page after the last row of the one before', async () => {
    await capture(5);
    const pages: string[][] = [];
    let cursor: DumpEntryItem | undefined;
    do {
      const page = await getDumpEntriesPage(userId, 2, cursor);
      pages.push(page.map(({content}) => content));
      cursor = page.at(-1);
    } while (pages.at(-1)!.length === 2);

    expect(pages).toEqual([
      ['Thought 5', 'Thought 4'],
      ['Thought 3', 'Thought 2'],
      ['Thought 1'],
    ]);
    expect(await countDumpEntries(userId)).toBe(5);
  });

  it('stays stable while new entries are captured', async () => {
    await capture(3);
    const firstPage = await getDumpEntriesPage(userId, 2);
    await createDumpEntry(userId, {content: 'Captured meanwhile'});
    const nextPage = await getDumpEntriesPage(userId, 2, firstPage.at(-1));
    expect(nextPage.map(({content}) => content)).toEqual(['Thought 1']);
  });

  it("never shows another user's entries", async () => {
    await createDumpEntry(newUserId(), {content: 'Not yours'});
    expect(await getDumpEntriesPage(userId, 20)).toEqual([]);
  });
});
