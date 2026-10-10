'use client';

import {useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {InboxStackIcon, ChevronUpIcon} from '@heroicons/react/24/outline';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {BacklogCountBadge} from './BacklogCountBadge';
import {MobileBacklogPanel} from './MobileBacklogPanel';

interface MobileBacklogProps {
  /** Staged cards — the pill's badge; the pill hides at zero */
  count: number;
  /** The staged cards, rendered by KanbanBoard */
  children: ReactNode;
}

/**
 * Mobile-only backlog entry: a peeking pill docked above the bottom tab bar
 * that opens the backlog bottom sheet. The sheet stages BACKLOG tasks; tapping
 * a card's "↑ Todo" button pulls it onto the board (BACKLOG → TODO). The
 * desktop equivalent is DesktopBacklog (drag-based); at md and up this
 * renders nothing.
 */
export default function MobileBacklog({count, children}: MobileBacklogProps) {
  const t = useTranslations('Board.Backlog');
  const {isMobile} = useBreakpoint();
  const [isOpen, setIsOpen] = useState(false);

  if (!isMobile) {
    return null;
  }

  const close = () => setIsOpen(false);

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
      {/* Hide the entry entirely when nothing is staged */}
      {count > 0 && renderPill()}

      <OverlayShell
        variant="sheet"
        isOpen={isOpen}
        onClose={close}
        closeLabel={t('closeLabel')}
        boxClassName="p-0 max-h-[80vh] flex flex-col"
      >
        <MobileBacklogPanel count={count} onClose={close}>
          {children}
        </MobileBacklogPanel>
      </OverlayShell>
    </>
  );
}
