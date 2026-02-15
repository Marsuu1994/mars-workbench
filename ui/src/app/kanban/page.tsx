import { fetchBoard } from "@/features/kanban/lib/boardSync";
import EmptyBoard from "@/features/kanban/components/EmptyBoard";
import KanbanBoard from "@/features/kanban/components/KanbanBoard";
import BoardHeader from "@/features/kanban/components/BoardHeader";

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
    <div className="flex flex-col h-screen">
      <BoardHeader periodKey={board.plan.periodKey} planId={board.plan.id} />
      <div className="flex-1 min-h-0 p-4">
        <KanbanBoard tasks={board.tasks} templateTypeMap={templateTypeMap} />
      </div>
    </div>
  );
}
