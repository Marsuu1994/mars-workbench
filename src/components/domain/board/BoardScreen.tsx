import type {BoardData} from '@/types/board';
import BoardHeader from '@/components/domain/shared/BoardHeader';
import ProgressDashboard from '@/components/domain/board/ProgressDashboard';
import KanbanBoard from '@/components/domain/board/KanbanBoard';

/** The page's data as fetchBoard shapes it: plan, tasks, progress. */
type BoardScreenProps = BoardData;

/**
 * The board page's screen layer: header + progress dashboard + kanban board
 * in a definite-height column (h-full against AppShell's <main> — or a fill
 * scenario frame). Shared by /kanban and the board scenarios so the two can
 * never drift apart. The header and the metrics read server data as-is; the
 * board keeps the tasks as state (KanbanBoard is the container).
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
