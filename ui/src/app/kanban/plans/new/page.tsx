import { getTaskTemplates } from "@/lib/db/taskTemplates";
import PlanForm from "@/features/kanban/components/PlanForm";

export default async function NewPlanPage() {
  const templates = await getTaskTemplates();

  return <PlanForm templates={templates} mode="create" />;
}
