'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {InboxStackIcon} from '@heroicons/react/24/outline';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';
import {FinishBox} from '@/components/ui/FinishBox';
import {BacklogCountBadge} from './BacklogCountBadge';

interface MobileBacklogPanelProps {
  /** Every task waiting — the header badge, and the finish box at zero */
  count: number;
  onClose: () => void;
  /** The backlog's groups, rendered by BoardPage */
  children: ReactNode;
}

/**
 * The mobile backlog sheet's content: the header with the count, then the
 * groups — or, once nothing waits, a box saying everything is on deck.
 * Shell-free, so
 * the live sheet and the design scenario render the identical panel — the
 * scenario shows it inline, without the top-layer dialog.
 */
export const MobileBacklogPanel = ({
  count,
  onClose,
  children,
}: MobileBacklogPanelProps) => {
  const t = useTranslations('Board.Backlog');

  const renderBody = () => (
    <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
      {count === 0 ? (
        <FinishBox
          title={t('Empty.title')}
          lines={[t('Empty.fact'), t('Empty.nextStep')]}
        />
      ) : (
        children
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
      {renderBody()}
    </>
  );
};
