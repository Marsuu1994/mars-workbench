'use client';

import {useTranslations} from 'next-intl';
import {CheckIcon} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {Toast} from '@/components/ui/Toast';
import {UNDO_TOAST_MS} from './constants';

interface MatrixUndoToastProps {
  /** The task just marked done */
  task: TaskItem;
  /** An active plan absorbed the points → "+N pts this week" copy */
  credited: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * The "Marked done" toast the matrix shows after a completion: Undo plus the
 * countdown over the undo window, with credited copy when the active plan
 * absorbed the points. Remount it (key by task) to restart the window.
 */
export const MatrixUndoToast = ({
  task,
  credited,
  onUndo,
  onDismiss,
}: MatrixUndoToastProps) => {
  const t = useTranslations('Priorities');

  return (
    <Toast
      tone="success"
      durationMs={UNDO_TOAST_MS}
      onDismiss={onDismiss}
      actionLabel={t('undo')}
      onAction={onUndo}
    >
      <CheckIcon className="size-[15px] stroke-[2.5]" />
      {credited
        ? t('doneToastCredited', {points: task.points})
        : t('doneToast')}
    </Toast>
  );
};
