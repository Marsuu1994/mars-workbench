'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {InboxStackIcon, ArrowUpIcon} from '@heroicons/react/24/outline';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';
import {BacklogCountBadge} from './BacklogCountBadge';

interface MobileBacklogPanelProps {
  /** Staged cards — the header badge and the empty state */
  count: number;
  onClose: () => void;
  /** The staged cards, rendered by KanbanBoard */
  children: ReactNode;
}

/**
 * The mobile backlog sheet's content: the header with the count, the
 * tap-to-pull hint and the staged cards (or an empty state). Shell-free, so
 * the live sheet and the design scenario render the identical panel — the
 * scenario shows it inline, without the top-layer dialog.
 */
export const MobileBacklogPanel = ({
  count,
  onClose,
  children,
}: MobileBacklogPanelProps) => {
  const t = useTranslations('Board.Backlog');

  const renderHint = () => (
    <div className="flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5 text-xs text-base-content/50 border-b border-base-content/10">
      <ArrowUpIcon className="size-3.5 text-primary flex-shrink-0" />
      {t('hintTapToTodo')}
    </div>
  );

  const renderBody = () => (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {count === 0 ? (
        <p className="text-center text-sm text-base-content/40 mt-10 px-6">
          {t('emptyState')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">{children}</div>
      )}
    </div>
  );

  return (
    <>
      <OverlayHeader
        icon={<InboxStackIcon className="size-5 text-primary" />}
        title={t('title')}
        badge={<BacklogCountBadge count={count} />}
        onClose={onClose}
        closeLabel={t('closeLabel')}
        className="px-4"
      />
      {renderHint()}
      {renderBody()}
    </>
  );
};
