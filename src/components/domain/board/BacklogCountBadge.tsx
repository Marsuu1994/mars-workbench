'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {cn} from '@/components/ui/cn';
import {BACKLOG_COUNT_CAP} from './backlog-group/constants';

interface BacklogCountBadgeProps {
  /** Staged tasks — every habit instance, step and one-off, not groups */
  count: number;
}

/**
 * The backlog's staged-task count — the desktop strip and panel header, the
 * mobile pill and sheet header. Past BACKLOG_COUNT_CAP it reads "8+"; its
 * accessible name keeps the real number. It bumps when the count changes.
 */
export const BacklogCountBadge = ({count}: BacklogCountBadgeProps) => {
  const t = useTranslations('Board.Backlog');
  const [firstCount] = useState(count);
  const shown =
    count > BACKLOG_COUNT_CAP
      ? t('countCapped', {cap: BACKLOG_COUNT_CAP})
      : String(count);

  return (
    // Keyed by the count, so each change replays the bump
    <span
      key={count}
      className={cn(
        'badge badge-primary badge-sm font-bold',
        count !== firstCount && 'fx-bump',
      )}
    >
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{t('stagedCount', {count})}</span>
    </span>
  );
};
