import type {DumpEntryItem} from '@/lib/db/dumpEntries';

/** One page of the feed, newest first; nextCursor null: the end of history. */
export interface DumpFeedPage {
  entries: DumpEntryItem[];
  nextCursor: string | null;
}

/**
 * What the Dump page takes: the week its header shows, and the feed's first
 * page and total count, which seed the page's own feed state.
 */
export interface DumpPageData {
  periodKey: string;
  initialEntries: DumpEntryItem[];
  initialNextCursor: string | null;
  initialTotalCount: number;
}
