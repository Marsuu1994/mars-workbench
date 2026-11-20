'use client';

import {Fragment, useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {InboxStackIcon, ChevronUpIcon} from '@heroicons/react/24/outline';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {BacklogCountBadge} from './BacklogCountBadge';
import {MobileBacklogPanel} from './MobileBacklogPanel';

interface MobileBacklogProps {
  /** Every task waiting — the pill's badge, which shows 0 when empty */
  count: number;
  /** The backlog's groups, rendered by BoardPage */
  children: ReactNode;
}

/**
 * Mobile-only backlog entry: a peeking pill docked above the bottom tab bar
 * that opens the backlog bottom sheet, at most three quarters of the screen's
 * height as it shows now (dvh: on iOS a vh counts the space under the
 * browser's bars too). The sheet stages BACKLOG tasks; tapping
 * group card's "↑ Todo" button pulls its next task onto the board
 * (BACKLOG → TODO). The pill stays when the backlog is empty, showing 0. The
 * desktop equivalent is DesktopBacklog; at md and up this renders nothing.
 */
export const MobileBacklog = ({count, children}: MobileBacklogProps) => {
  const t = useTranslations('Board.Backlog');
  const {isMobile} = useBreakpoint();
  const [isOpen, setIsOpen] = useState(false);
  // Bumped on every close: the groups remount, so their queues open closed
  const [closeCount, setCloseCount] = useState(0);

  if (!isMobile) {
    return null;
  }

  const close = () => {
    setIsOpen(false);
    setCloseCount(prev => prev + 1);
  };

  const renderPill = () => (
    <button
      onClick={() => setIsOpen(true)}
      title={t('openLabel')}
      className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 flex items-center gap-2.5 h-11 px-3.5 rounded-2xl bg-base-100 border border-base-content/10 shadow-lg cursor-pointer"
    >
      <InboxStackIcon className="size-[18px] text-primary" />
      <span className="text-sm font-semibold">{t('title')}</span>
      <BacklogCountBadge count={count} />
      <ChevronUpIcon className="size-4 text-base-content/40 ml-auto" />
    </button>
  );

  return (
    <>
      {renderPill()}

      <OverlayShell
        variant="sheet"
        isOpen={isOpen}
        onClose={close}
        closeLabel={t('closeLabel')}
        boxClassName="p-0 max-h-[75dvh] flex flex-col"
      >
        <MobileBacklogPanel count={count} onClose={close}>
          <Fragment key={closeCount}>{children}</Fragment>
        </MobileBacklogPanel>
      </OverlayShell>
    </>
  );
};
