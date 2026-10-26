'use client';

import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {MobileMoveToPanel} from './MobileMoveToPanel';

interface MobileMoveToSheetProps {
  /** Task the sheet is open for; null = closed */
  task: TaskItem | null;
  onClose: () => void;
}

/**
 * Mobile Move-to bottom sheet, opened by tapping any matrix card. Wraps
 * MobileMoveToPanel in the live <dialog> shell; at md and up this renders
 * nothing (desktop uses the popover).
 */
export const MobileMoveToSheet = ({task, onClose}: MobileMoveToSheetProps) => {
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
      {task && <MobileMoveToPanel task={task} />}
    </OverlayShell>
  );
};
