import type {ComponentProps} from 'react';
import type {BoardPlan} from '@/utils/taskUtils';
import BoardHeader from '@/components/domain/shared/BoardHeader';
import ProgressDashboard from '@/components/domain/board/ProgressDashboard';
import KanbanBoard from '@/components/domain/board/KanbanBoard';

interface BoardScreenProps {
  /** The active plan — its week titles the header, the board reads the rest */
  plan: BoardPlan;
  progress: ComponentProps<typeof ProgressDashboard>;
  tasks: ComponentProps<typeof KanbanBoard>['tasks'];
}

/**
 * The board page's screen layer: header + progress dashboard + kanban board
 * in a definite-height column (h-full against AppShell's <main> — or a fill
 * scenario frame). Shared by /kanban and the board scenarios so the two can
 * never drift apart.
 */
export const BoardScreen = ({plan, progress, tasks}: BoardScreenProps) => (
  <div className="flex flex-col h-full">
    <BoardHeader periodKey={plan.periodKey} />
    <ProgressDashboard {...progress} />
    <div className="flex-1 min-h-0">
      <KanbanBoard tasks={tasks} plan={plan} />
    </div>
  </div>
);
