'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {
  InboxStackIcon,
  ChevronUpIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import type {RiskLevel} from '@/utils/taskUtils';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {MobileBacklogContent} from './MobileBacklogContent';

interface MobileBacklogProps {
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
  onPull: (taskId: string) => void;
}

/**
 * Mobile-only backlog entry: a peeking pill docked above the bottom tab bar
 * that opens the backlog bottom sheet. The sheet stages BACKLOG tasks; tapping
 * a card's "↑ Todo" button pulls it onto the board (BACKLOG → TODO). The
 * desktop equivalent is DesktopBacklog (drag-based); at md and up this
 * renders nothing.
 */
export default function MobileBacklog({
  tasks,
  today,
  riskMap,
  templateFreqMap,
  onPull,
}: MobileBacklogProps) {
  const t = useTranslations('Board.Backlog');
  const {isMobile} = useBreakpoint();
  const [isOpen, setIsOpen] = useState(false);

  if (!isMobile) {
    return null;
  }

  const countBadge = (
    <span className="badge badge-primary badge-sm font-bold">
      {tasks.length}
    </span>
  );

  const renderPill = () => (
    <button
      onClick={() => setIsOpen(true)}
      title={t('openLabel')}
      className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 flex items-center gap-2.5 h-11 px-3.5 rounded-2xl bg-base-100 border border-base-content/10 shadow-lg cursor-pointer"
    >
      <InboxStackIcon className="size-[18px] text-primary" />
      <span className="text-sm font-semibold">{t('title')}</span>
      {countBadge}
      <ChevronUpIcon className="size-4 text-base-content/40 ml-auto" />
    </button>
  );

  const renderHint = () => (
    <div className="flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5 text-xs text-base-content/50 border-b border-base-content/10">
      <ArrowUpIcon className="size-3.5 text-primary flex-shrink-0" />
      {t('hintTapToTodo')}
    </div>
  );

  return (
    <>
      {/* Hide the entry entirely when nothing is staged */}
      {tasks.length > 0 && renderPill()}

      <OverlayShell
        variant="sheet"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        closeLabel={t('closeLabel')}
        boxClassName="p-0 max-h-[80vh] flex flex-col"
      >
        <OverlayHeader
          icon={<InboxStackIcon className="size-5 text-primary" />}
          title={t('title')}
          badge={countBadge}
          onClose={() => setIsOpen(false)}
          closeLabel={t('closeLabel')}
          className="px-4"
        />
        {renderHint()}
        <div className="flex-1 overflow-y-auto p-4">
          <MobileBacklogContent
            tasks={tasks}
            today={today}
            riskMap={riskMap}
            templateFreqMap={templateFreqMap}
            onPull={onPull}
          />
        </div>
      </OverlayShell>
    </>
  );
}
