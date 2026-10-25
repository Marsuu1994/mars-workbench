'use client';

import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {
  TaskModalPanel,
  type TaskModalMode,
  type TaskModalPanelProps,
} from './TaskModalPanel';

interface TaskModalProps extends Omit<TaskModalPanelProps, 'mode'> {
  isOpen: boolean;
  mode?: TaskModalMode;
}

export const TaskModal = ({
  isOpen,
  freshData,
  onClose,
  onSaved,
  mode: modeProp,
  template,
  quadrant,
}: TaskModalProps) => {
  const mode: TaskModalMode = modeProp ?? (template ? 'edit' : 'create');

  return (
    // Backdrop-dismiss stays off: a stray tap must not discard form input
    <OverlayShell
      variant="responsive"
      isOpen={isOpen}
      onClose={onClose}
      dismissOnBackdrop={false}
      corners
      boxClassName="max-w-lg p-0"
    >
      {/* Mounted only while open, so every open starts a fresh form (the
          panel's initial state is the reset the old isOpen effect did). */}
      {isOpen && (
        <TaskModalPanel
          freshData={freshData}
          onClose={onClose}
          onSaved={onSaved}
          mode={mode}
          template={template}
          quadrant={quadrant}
        />
      )}
    </OverlayShell>
  );
};
