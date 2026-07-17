import type {ComponentProps} from 'react';
import BoardHeader from '@/components/domain/shared/BoardHeader';
import PriorityMatrixPage from '@/components/domain/priorities/PriorityMatrixPage';

type MatrixProps = ComponentProps<typeof PriorityMatrixPage>;

interface PrioritiesScreenProps {
  periodKey: string;
  tasks: MatrixProps['tasks'];
  activePlan: MatrixProps['activePlan'];
  initialOpenPopoverTaskId?: string;
}

/**
 * The priorities page's screen layer: the same app header as the board page
 * (both breakpoints) above the matrix, in a definite-height column (h-full
 * against AppShell's <main> — or a fill scenario frame). Shared by
 * /kanban/priorities and the priorities scenarios so the two can never drift
 * apart.
 */
export const PrioritiesScreen = ({
  periodKey,
  tasks,
  activePlan,
  initialOpenPopoverTaskId,
}: PrioritiesScreenProps) => (
  <div className="flex flex-col h-full">
    <BoardHeader periodKey={periodKey} />
    <PriorityMatrixPage
      tasks={tasks}
      activePlan={activePlan}
      initialOpenPopoverTaskId={initialOpenPopoverTaskId}
    />
  </div>
);
