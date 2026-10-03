'use client';

import type {TaskItem} from '@/lib/db/tasks';
import {MatrixUndoToast} from '@/components/domain/priorities/MatrixUndoToast';

interface DoneToastScenarioProps {
  task: TaskItem;
  credited: boolean;
}

/**
 * The matrix's undo toast, composed over the screen for the Done-toast tabs.
 * The toast only exists after a completion write, which a scenario must not
 * make, so those tabs render the post-completion fixtures plus this shared
 * toast with inert handlers; the frame's frozen time holds its countdown.
 */
export const DoneToastScenario = ({task, credited}: DoneToastScenarioProps) => (
  <MatrixUndoToast
    task={task}
    credited={credited}
    onUndo={() => undefined}
    onDismiss={() => undefined}
  />
);
