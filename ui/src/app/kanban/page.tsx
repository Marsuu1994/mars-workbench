import { fetchBoardAction } from "@/features/kanban/actions/boardActions";
import EmptyBoard from "@/features/kanban/components/EmptyBoard";
import KanbanBoard from "@/features/kanban/components/KanbanBoard";
import BoardHeader from "@/features/kanban/components/BoardHeader";
import ProgressDashboard from "@/features/kanban/components/ProgressDashboard";

export default async function KanbanPage() {
  const board = await fetchBoardAction();

  if (!board) {
    return <EmptyBoard />;
  }

  return (
    <div className="flex flex-col h-screen">
      <BoardHeader periodKey={board.plan.periodKey} planId={board.plan.id} />
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
      <div className="flex-1 min-h-0 p-4">
        <KanbanBoard tasks={board.tasks} />
      </div>
    </div>
  );
}
