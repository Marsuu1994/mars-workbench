'use client';

import {BoardHeader} from '@/components/domain/shared/BoardHeader';
import type {DumpPageData} from '@/types/dump';
import {useDumpFeed} from '@/hooks/useDumpFeed';
import {DUMP_COLUMN_MAX_W} from './constants';
import {DumpTitleBar} from './DumpTitleBar';
import {DumpComposer} from './DumpComposer';
import {DumpFeed} from './DumpFeed';
import {DumpPageContext, type DumpPageContextValue} from './DumpPageContext';

/**
 * The Dump page (/kanban/dump): shared app header + dump title bar, a pinned
 * composer above a scrolling day-grouped feed. One useDumpFeed instance backs
 * both — the composer's capture prepends into the same list the feed renders;
 * its components reach capture and load more through DumpPageContext.
 */
export const DumpPage = ({
  periodKey,
  initialEntries,
  initialNextCursor,
  initialTotalCount,
}: DumpPageData) => {
  const {
    entries,
    totalCount,
    hasMore,
    isAppending,
    captureError,
    capture,
    loadMore,
  } = useDumpFeed({
    entries: initialEntries,
    nextCursor: initialNextCursor,
    totalCount: initialTotalCount,
  });

  const pageContext: DumpPageContextValue = {capture, captureError, loadMore};

  return (
    <DumpPageContext value={pageContext}>
      <div className="flex flex-col h-full">
        <BoardHeader periodKey={periodKey} />
        <DumpTitleBar totalCount={totalCount} />

        <div className="flex-shrink-0 border-b border-base-content/10 px-4 py-3">
          <div className={`mx-auto w-full ${DUMP_COLUMN_MAX_W}`}>
            <DumpComposer />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            className={`mx-auto w-full ${DUMP_COLUMN_MAX_W} px-4 py-4 pb-12`}
          >
            <DumpFeed
              entries={entries}
              hasMore={hasMore}
              isAppending={isAppending}
            />
          </div>
        </div>
      </div>
    </DumpPageContext>
  );
};
