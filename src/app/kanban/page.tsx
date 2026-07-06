import {
  fetchBoardAction,
  getEmptyBoardStateAction,
} from '@/actions/boardActions';
import EmptyBoard from '@/components/board/EmptyBoard';
import KanbanBoard from '@/components/board/KanbanBoard';
import BoardHeader from '@/components/shared/BoardHeader';
import ProgressDashboard from '@/components/board/ProgressDashboard';

export default async function KanbanPage() {
  const board = await fetchBoardAction();

  if (!board) {
    const emptyState = await getEmptyBoardStateAction();
    return (
      <EmptyBoard
        stats={emptyState.kind === 'returning' ? emptyState.stats : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BoardHeader periodKey={board.plan.periodKey} />
      <ProgressDashboard
        todayDoneCount={board.todayDoneCount}
        todayTotalCount={board.todayTotalCount}
        todayDonePoints={board.todayDonePoints}
        todayTotalPoints={board.todayTotalPoints}
        weekDoneCount={board.weekDoneCount}
        weekProjectedCount={board.weekProjectedCount}
        weekDonePoints={board.weekDonePoints}
        weekProjectedPoints={board.weekProjectedPoints}
        daysElapsed={board.daysElapsed}
      />
      <div className="flex-1 min-h-0">
        <KanbanBoard
          tasks={board.tasks}
          daysElapsed={board.daysElapsed}
          planTemplates={board.plan.planTemplates}
        />
      </div>
    </div>
  );
}
