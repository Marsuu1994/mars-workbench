'use client';

import {useTranslations} from 'next-intl';
import {BACKLOG_COUNT_CAP} from './backlogConstants';

interface BacklogCountBadgeProps {
  /** Every task waiting in the backlog, not its groups */
  count: number;
}

/**
 * The backlog's count — the desktop strip and panel header, the mobile pill
 * and sheet header. Past BACKLOG_COUNT_CAP it shows "8+"; a screen reader
 * always hears the real number.
 */
export const BacklogCountBadge = ({count}: BacklogCountBadgeProps) => {
  const t = useTranslations('Board.Backlog');
  const shown = count > BACKLOG_COUNT_CAP ? `${BACKLOG_COUNT_CAP}+` : count;

  return (
    <>
      <span aria-hidden className="badge badge-primary badge-sm font-bold">
        {shown}
      </span>
      <span className="sr-only">{t('countLabel', {count})}</span>
    </>
  );
};
