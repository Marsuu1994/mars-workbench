import type {DumpEntryItem} from '@/lib/db/dumpEntries';

/** One page of the dump feed, newest first; `nextCursor` null: the last page. */
export interface DumpFeedPage {
  entries: DumpEntryItem[];
  nextCursor: string | null;
}

/** What `fetchDumpEntriesAction` returns: a page, or the validation error. */
export type DumpFeedResult = {data: DumpFeedPage} | {error: unknown};

/**
 * What the Dump page starts from, shaped by the route: the header's week and
 * the feed's first page + total, which the page then keeps as client state
 * (captures prepend, load-more appends).
 */
export interface DumpPageData {
  periodKey: string;
  initialEntries: DumpEntryItem[];
  initialNextCursor: string | null;
  initialTotalCount: number;
}
