'use client';

import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import type {TrackTargetStatus} from '@/schemas';
import {MoveToRows} from './MoveToRows';

interface MobileMoveToPanelProps {
  task: TaskItem;
  isTracked: boolean;
  hasActivePlan: boolean;
  onTrack: (status: TrackTargetStatus) => void;
  onComplete: () => void;
}

/**
 * Shell-free body of the mobile Move-to sheet: the card summary (title,
 * then description · size · points) over the chooser rows. MobileMoveToSheet
 * mounts it in the live bottom sheet; the priorities scenario renders it
 * inline inside a frame.
 */
export const MobileMoveToPanel = ({
  task,
  isTracked,
  hasActivePlan,
  onTrack,
  onComplete,
}: MobileMoveToPanelProps) => {
  const t = useTranslations('Priorities');
  const tSize = useTranslations('Enums.TaskSize');
  const {title, description, size, points} = task;

  const meta = [description, tSize(size), t('sheetPoints', {points})]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="px-4 pt-4 pb-6">
      <h3 className="text-[15px] font-bold">{title}</h3>
      <p className="text-xs text-base-content/60 mt-0.5 mb-4">{meta}</p>
      <MoveToRows
        variant="sheet"
        isTracked={isTracked}
        hasActivePlan={hasActivePlan}
        onTrack={onTrack}
        onComplete={onComplete}
      />
    </div>
  );
};
