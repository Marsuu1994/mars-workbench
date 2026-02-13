import { getTaskTemplates } from "@/lib/db/taskTemplates";
import CreatePlanForm from "@/features/kanban/components/CreatePlanForm";

export default async function NewPlanPage() {
  const templates = await getTaskTemplates();

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold mb-1">Create Weekly Plan</h2>
        <p className="text-base-content/50 mb-7">
          Set up your task templates and start a new week.
        </p>
        <CreatePlanForm templates={templates} />
      </div>
    </div>
  );
}
