import type {ComponentProps} from 'react';
import BoardHeader from '@/components/domain/shared/BoardHeader';
import ProgressDashboard from '@/components/domain/board/ProgressDashboard';
import KanbanBoard from '@/components/domain/board/KanbanBoard';

interface BoardScreenProps {
  periodKey: string;
  progress: ComponentProps<typeof ProgressDashboard>;
  tasks: ComponentProps<typeof KanbanBoard>['tasks'];
  planLines: ComponentProps<typeof KanbanBoard>['planLines'];
  planMode: ComponentProps<typeof KanbanBoard>['planMode'];
}

/**
 * The board page's screen layer: header + progress dashboard + kanban board
 * in a definite-height column (h-full against AppShell's <main> — or a fill
 * scenario frame). Shared by /kanban and the board scenarios so the two can
 * never drift apart.
 */
export const BoardScreen = ({
  periodKey,
  progress,
  tasks,
  planLines,
  planMode,
}: BoardScreenProps) => (
  <div className="flex flex-col h-full">
    <BoardHeader periodKey={periodKey} />
    <ProgressDashboard {...progress} />
    <div className="flex-1 min-h-0">
      <KanbanBoard tasks={tasks} planLines={planLines} planMode={planMode} />
    </div>
  </div>
);
