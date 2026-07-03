import { fetchBoardAction, getEmptyBoardStateAction } from "@/features/board/actions/boardActions";
import EmptyBoard from "@/features/board/components/EmptyBoard";
import KanbanBoard from "@/features/board/components/KanbanBoard";
import BoardHeader from "@/components/kanban/BoardHeader";
import ProgressDashboard from "@/features/board/components/ProgressDashboard";

export default async function KanbanPage() {
  const board = await fetchBoardAction();

  if (!board) {
    const emptyState = await getEmptyBoardStateAction();
    return (
      <EmptyBoard
        stats={emptyState.kind === "returning" ? emptyState.stats : undefined}
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
