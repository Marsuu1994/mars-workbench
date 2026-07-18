'use client';

import {useTranslations} from 'next-intl';
import {InboxStackIcon, ArrowUpIcon} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import type {RiskLevel} from '@/utils/taskUtils';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';
import {MobileBacklogContent} from '@/components/domain/board/MobileBacklogContent';

interface MobileBacklogPanelProps {
  tasks: TaskItem[];
  today: Date;
  /** Precomputed per-task risk (the live board computes this internally). */
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
}

const NOOP = () => {};

/**
 * The mobile backlog's content, rendered inline as a phone-width bottom sheet
 * inside a scenario frame. Mirrors the live MobileBacklog (same header / hint /
 * MobileBacklogContent) but without the top-layer <dialog>, so it stays inside
 * the frame and inherits its inertness.
 */
export const MobileBacklogPanel = ({
  tasks,
  today,
  riskMap,
  templateFreqMap,
}: MobileBacklogPanelProps) => {
  const t = useTranslations('Board.Backlog');

  return (
    <div className="flex h-full flex-col bg-base-200/20 p-3">
      <div className="mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-lg">
        <OverlayHeader
          icon={<InboxStackIcon className="size-5 text-primary" />}
          title={t('title')}
          badge={
            <span className="badge badge-primary badge-sm font-bold">
              {tasks.length}
            </span>
          }
          onClose={NOOP}
          closeLabel={t('closeLabel')}
          className="px-4"
        />
        <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-base-content/10 px-4 py-2.5 text-xs text-base-content/50">
          <ArrowUpIcon className="size-3.5 flex-shrink-0 text-primary" />
          {t('hintTapToTodo')}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <MobileBacklogContent
            tasks={tasks}
            today={today}
            riskMap={riskMap}
            templateFreqMap={templateFreqMap}
            onPull={NOOP}
          />
        </div>
      </div>
    </div>
  );
};
