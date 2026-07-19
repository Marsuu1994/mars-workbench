'use client';

import BoardHeader from '@/components/domain/shared/BoardHeader';
import type {DumpEntryItem} from '@/lib/db/dumpEntries';
import {useDumpFeed} from '@/hooks/useDumpFeed';
import {DUMP_COLUMN_MAX_W} from './constants';
import {DumpTitleBar} from './DumpTitleBar';
import {DumpComposer} from './DumpComposer';
import {DumpFeed} from './DumpFeed';

interface DumpScreenProps {
  periodKey: string;
  initialEntries: DumpEntryItem[];
  initialNextCursor: string | null;
  totalCount: number;
}

/**
 * The dump page's screen layer: shared app header + dump title bar, a pinned
 * composer above a scrolling day-grouped feed. One useDumpFeed instance backs
 * both — the composer's capture prepends into the same list the feed renders.
 */
export const DumpScreen = ({
  periodKey,
  initialEntries,
  initialNextCursor,
  totalCount,
}: DumpScreenProps) => {
  const feed = useDumpFeed({
    entries: initialEntries,
    nextCursor: initialNextCursor,
    totalCount,
  });

  return (
    <div className="flex flex-col h-full">
      <BoardHeader periodKey={periodKey} />
      <DumpTitleBar totalCount={feed.totalCount} />

      <div className="flex-shrink-0 border-b border-base-content/10 px-4 py-3">
        <div className={`mx-auto w-full ${DUMP_COLUMN_MAX_W}`}>
          <DumpComposer
            captureError={feed.captureError}
            onCapture={feed.capture}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className={`mx-auto w-full ${DUMP_COLUMN_MAX_W} px-4 py-4 pb-12`}>
          <DumpFeed
            entries={feed.entries}
            hasMore={feed.hasMore}
            isAppending={feed.isAppending}
            onLoadMore={feed.loadMore}
          />
        </div>
      </div>
    </div>
  );
};
