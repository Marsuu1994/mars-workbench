import { fetchBoard } from "@/features/kanban/lib/boardSync";

export default async function KanbanPage() {
  const board = await fetchBoard();

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">No Active Plan</h1>
        <p className="text-base-content/70">
          Create a plan to get started with your weekly kanban board.
        </p>
      </div>
    );
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
