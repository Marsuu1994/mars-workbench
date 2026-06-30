import { fetchBoardAction } from "@/features/kanban/actions/boardActions";
import EmptyBoard from "@/features/kanban/components/kanban/EmptyBoard";
import KanbanBoard from "@/features/kanban/components/kanban/KanbanBoard";
import BoardHeader from "@/features/kanban/components/kanban/BoardHeader";
import ProgressDashboard from "@/features/kanban/components/kanban/ProgressDashboard";

export default async function KanbanPage() {
  const board = await fetchBoardAction();

  if (!board) {
    return <EmptyBoard />;
  }

  return (
    <div className="flex flex-col h-full">
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
