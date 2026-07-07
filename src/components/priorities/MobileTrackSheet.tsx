'use client';

import {useTranslations} from 'next-intl';
import {
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import type {TrackTargetStatus} from '@/schemas';
import {BottomSheet} from '@/components/ui/overlay/BottomSheet';
import {TRACK_TARGETS} from './constants';

interface MobileTrackSheetProps {
  /** Task the sheet is open for; null = closed */
  task: TaskItem | null;
  hasActivePlan: boolean;
  onClose: () => void;
  onTrack: (taskId: string, status: TrackTargetStatus) => void;
}

/**
 * Mobile track-this-week bottom sheet, opened by tapping an untracked
 * matrix card. Shows the card summary and the two board target columns.
 * With no active plan the buttons render disabled with a "No active plan
 * yet" note (the desktop equivalent disables the send button).
 */
export default function MobileTrackSheet({
  task,
  hasActivePlan,
  onClose,
  onTrack,
}: MobileTrackSheetProps) {
  const t = useTranslations('Priorities');
  const tStatus = useTranslations('Enums.TaskStatus');
  const tSize = useTranslations('Enums.TaskSize');

  const renderSummary = (current: TaskItem) => {
    const meta = [
      current.description,
      tSize(current.size),
      t('sheetPoints', {points: current.points}),
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <>
        <h3 className="text-[15px] font-bold">{current.title}</h3>
        <p className="text-xs text-base-content/60 mt-0.5 mb-4">{meta}</p>
      </>
    );
  };

  const renderTrackButton = (status: TrackTargetStatus, dotClass: string) => (
    <button
      key={status}
      type="button"
      disabled={!hasActivePlan}
      onClick={() => task && onTrack(task.id, status)}
      className="flex items-center gap-2.5 w-full px-3.5 py-3 mb-2 rounded-card border border-base-content/10 bg-base-100 text-sm font-medium transition-colors enabled:cursor-pointer enabled:hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span
        className={`w-[9px] h-[9px] rounded-full flex-shrink-0 ${dotClass}`}
      />
      {tStatus(status)}
      <ArrowRightIcon className="size-4 ml-auto text-base-content/40" />
    </button>
  );

  return (
    <BottomSheet
      isOpen={task !== null}
      onClose={onClose}
      closeLabel={t('closeLabel')}
      bodyClassName="px-4 pb-6"
    >
      {task && renderSummary(task)}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50 mb-2">
        {t('trackTitle')}
      </p>
      {!hasActivePlan && (
        <p className="flex items-center gap-1.5 text-xs text-warning mb-2">
          <ExclamationTriangleIcon className="size-3.5 flex-shrink-0" />
          {t('noPlanTooltip')}
        </p>
      )}
      {TRACK_TARGETS.map(({status, dotClass}) =>
        renderTrackButton(status, dotClass),
      )}
    </BottomSheet>
  );
}
