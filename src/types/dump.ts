import type {DumpEntryItem} from '@/lib/db/dumpEntries';

/** One page of the dump feed, newest first; null cursor: no more pages. */
export interface DumpFeedPage {
  entries: DumpEntryItem[];
  nextCursor: string | null;
}

/** What the feed's read action returns: a page, or why it couldn't read one. */
export type DumpFeedResult = {data: DumpFeedPage} | {error: unknown};

/**
 * What the Dump page needs, shaped by the route: the header's week and the
 * feed's first page + total, which the page then keeps as client state
 * (captures prepend, load more appends).
 */
export interface DumpPageData {
  periodKey: string;
  initialEntries: DumpEntryItem[];
  initialNextCursor: string | null;
  initialTotalCount: number;
}
