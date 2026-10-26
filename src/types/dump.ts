import type {DumpEntryItem} from '@/lib/db/dumpEntries';

/** One page of the feed, newest first; `nextCursor` null: the last page. */
export interface DumpFeedPage {
  entries: DumpEntryItem[];
  nextCursor: string | null;
}

/**
 * What the Dump page needs, shaped by the route's adapter: the week the
 * header shows and the feed's first page and total, which seed the page's
 * own feed state (capture and load-more change it from there).
 */
export interface DumpPageData {
  periodKey: string;
  initialEntries: DumpEntryItem[];
  initialNextCursor: string | null;
  initialTotalCount: number;
}
