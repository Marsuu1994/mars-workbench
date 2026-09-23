'use client';

import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import type {TrackTargetStatus} from '@/schemas';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {MobileMoveToPanel} from './MobileMoveToPanel';

interface MobileMoveToSheetProps {
  /** Task the sheet is open for; null = closed */
  task: TaskItem | null;
  /** The open task is already on the board → Done only */
  isTracked: boolean;
  hasActivePlan: boolean;
  onClose: () => void;
  onTrack: (taskId: string, status: TrackTargetStatus) => void;
  onComplete: (taskId: string) => void;
}

/**
 * Mobile Move-to bottom sheet, opened by tapping any matrix card. Wraps
 * MobileMoveToPanel in the live <dialog> shell; at md and up this renders
 * nothing (desktop uses the popover).
 */
export const MobileMoveToSheet = ({
  task,
  isTracked,
  hasActivePlan,
  onClose,
  onTrack,
  onComplete,
}: MobileMoveToSheetProps) => {
  const t = useTranslations('Priorities');
  const {isMobile} = useBreakpoint();

  if (!isMobile) {
    return null;
  }

  return (
    <OverlayShell
      variant="sheet"
      isOpen={task !== null}
      onClose={onClose}
      closeLabel={t('closeLabel')}
      boxClassName="p-0"
    >
      {task && (
        <MobileMoveToPanel
          task={task}
          isTracked={isTracked}
          hasActivePlan={hasActivePlan}
          onTrack={status => onTrack(task.id, status)}
          onComplete={() => onComplete(task.id)}
        />
      )}
    </OverlayShell>
  );
};
