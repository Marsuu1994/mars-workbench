import {
  fetchBoardAction,
  getEmptyBoardStateAction,
} from '@/actions/boardActions';
import EmptyBoard from '@/components/domain/board/EmptyBoard';
import {BoardScreen} from '@/components/domain/board/BoardScreen';

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
    <BoardScreen
      periodKey={board.plan.periodKey}
      progress={{
        todayDoneCount: board.todayDoneCount,
        todayTotalCount: board.todayTotalCount,
        todayDonePoints: board.todayDonePoints,
        todayTotalPoints: board.todayTotalPoints,
        weekDoneCount: board.weekDoneCount,
        weekProjectedCount: board.weekProjectedCount,
        weekDonePoints: board.weekDonePoints,
        weekProjectedPoints: board.weekProjectedPoints,
        daysElapsed: board.daysElapsed,
      }}
      tasks={board.tasks}
      planTemplates={board.plan.planTemplates}
    />
  );
}
