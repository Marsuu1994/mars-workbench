import type {DumpEntryItem} from '@/lib/db/dumpEntries';

/** One page of the dump feed, as fetchDumpEntriesAction returns it. */
export interface DumpFeedPage {
  entries: DumpEntryItem[];
  /** Opaque keyset cursor for the next page; null: this is the last one */
  nextCursor: string | null;
}

/** What the Dump page starts from: the route's adapter shapes it. */
export interface DumpPageProps {
  /** The header's week badge: dump is plan-independent, so today's week */
  periodKey: string;
  initialEntries: DumpEntryItem[];
  initialNextCursor: string | null;
  initialTotalCount: number;
}
