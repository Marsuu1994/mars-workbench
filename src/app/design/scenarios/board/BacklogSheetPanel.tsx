'use client';

import {useTranslations} from 'next-intl';
import {InboxStackIcon, ArrowUpIcon} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import type {RiskLevel} from '@/utils/taskUtils';
import {BacklogSheetContent} from '@/components/domain/board/BacklogSheetContent';

interface BacklogSheetPanelProps {
  tasks: TaskItem[];
  today: Date;
}

// Scenario data is static: no risk overlay and no multi-instance badges, so
// empty lookup maps stand in (BacklogSheetContent falls back to 'normal'/freq 1).
const EMPTY_RISK_MAP = new Map<string, RiskLevel>();
const EMPTY_FREQ_MAP = new Map<string, number>();
const NOOP = () => {};

/**
 * The mobile backlog "Queued" sheet's content, rendered inline as a
 * phone-width bottom sheet inside a scenario frame. Mirrors the live
 * MobileBacklogSheet (same header / hint / BacklogSheetContent) but without the
 * top-layer <dialog>, so it stays inside the frame and inherits its inertness.
 */
export const BacklogSheetPanel = ({tasks, today}: BacklogSheetPanelProps) => {
  const t = useTranslations('Board.Backlog');

  return (
    <div className="flex h-full flex-col bg-base-200/20 p-3">
      <div className="mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-lg">
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-base-content/10 px-4 pt-4 pb-3 text-base font-bold">
          <InboxStackIcon className="size-5 text-primary" />
          {t('title')}
          <span className="badge badge-primary badge-sm font-bold">
            {tasks.length}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-base-content/10 px-4 py-2.5 text-xs text-base-content/50">
          <ArrowUpIcon className="size-3.5 flex-shrink-0 text-primary" />
          {t('hintTapToTodo')}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <BacklogSheetContent
            tasks={tasks}
            today={today}
            riskMap={EMPTY_RISK_MAP}
            templateFreqMap={EMPTY_FREQ_MAP}
            onPull={NOOP}
          />
        </div>
      </div>
    </div>
  );
};
