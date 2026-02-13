import { fetchBoard } from "@/features/kanban/lib/boardSync";
import EmptyBoard from "@/features/kanban/components/EmptyBoard";

export default async function KanbanPage() {
  const board = await fetchBoard();

  if (!board) {
    return <EmptyBoard />;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Kanban Board — {board.plan.periodKey}
      </h1>
      <p className="text-base-content/70 mb-6">
        Points earned: {board.todayPoints} | Tasks: {board.tasks.length}
      </p>
      {/* KanbanBoard client component will be added here */}
      <pre className="text-xs opacity-50">
        {JSON.stringify(
          { planId: board.plan.id, taskCount: board.tasks.length },
          null,
          2
        )}
      </pre>
    </div>
  );
}
