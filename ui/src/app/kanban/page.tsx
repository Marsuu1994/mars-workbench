import { fetchBoard } from "@/features/kanban/lib/boardSync";
import EmptyBoard from "@/features/kanban/components/EmptyBoard";
import KanbanBoard from "@/features/kanban/components/KanbanBoard";

export default async function KanbanPage() {
  const board = await fetchBoard();

  if (!board) {
    return <EmptyBoard />;
  }

  const templateTypeMap: Record<string, string> = {};
  for (const pt of board.plan.planTemplates) {
    templateTypeMap[pt.templateId] = pt.template.type;
  }

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">
        Kanban Board — {board.plan.periodKey}
      </h1>
      <p className="text-base-content/70 mb-6">
        Points earned: {board.todayPoints} | Tasks: {board.tasks.length}
      </p>
      <div className="flex-1 min-h-0">
        <KanbanBoard tasks={board.tasks} templateTypeMap={templateTypeMap} />
      </div>
    </div>
  );
}
