'use client';

import {useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {InboxArrowDownIcon} from '@heroicons/react/24/outline';
import type {DumpEntryItem} from '@/lib/db/dumpEntries';
import {EmptyState} from '@/components/ui/EmptyState';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {dumpTodayKey, groupEntriesByDay, shiftDayKey} from '@/utils/dump';
import {DUMP_SENTINEL_ROOT_MARGIN} from './constants';
import {DumpEntryCard} from './DumpEntryCard';
import {useDumpPageContext} from './DumpPageContext';

interface DumpFeedProps {
  entries: DumpEntryItem[];
  hasMore: boolean;
  isAppending: boolean;
}

/** Day-grouped, newest-first feed with an IntersectionObserver load-more
 *  sentinel (the page's loadMore) and an empty state. */
export const DumpFeed = ({entries, hasMore, isAppending}: DumpFeedProps) => {
  const t = useTranslations('Dump');
  const {loadMore} = useDumpPageContext();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fire load-more as the bottom sentinel approaches the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      observed => {
        if (observed[0]?.isIntersecting) loadMore();
      },
      {rootMargin: DUMP_SENTINEL_ROOT_MARGIN},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (entries.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<InboxArrowDownIcon className="size-20 text-base-content/15" />}
        title={t('emptyTitle')}
        description={t('emptyDesc')}
      />
    );
  }

  const todayKey = dumpTodayKey();
  const yesterdayKey = shiftDayKey(todayKey, -1);
  const groups = groupEntriesByDay(entries);

  const renderHeading = (key: string, dateLabel: string) => {
    const named =
      key === todayKey
        ? t('today')
        : key === yesterdayKey
          ? t('yesterday')
          : null;
    return (
      <SectionLabel className="flex items-center gap-2">
        {named ? (
          <>
            <span className="font-bold text-base-content/70">{named}</span>
            <span aria-hidden>—</span>
            <span>{dateLabel}</span>
          </>
        ) : (
          dateLabel
        )}
      </SectionLabel>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {groups.map(group => (
        <div key={group.key} className="flex flex-col gap-2.5">
          <div className="mt-2 first:mt-0">
            {renderHeading(group.key, group.dateLabel)}
          </div>
          {group.entries.map(entry => (
            <DumpEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="flex flex-col gap-2.5 pt-1">
          {isAppending && (
            <>
              <div className="skeleton h-16 w-full rounded-[10px]" />
              <div className="skeleton h-16 w-full rounded-[10px]" />
            </>
          )}
        </div>
      )}
    </div>
  );
};
