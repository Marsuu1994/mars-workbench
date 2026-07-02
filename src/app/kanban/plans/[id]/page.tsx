import { notFound } from "next/navigation";
import { getPlanWithTemplates } from "@/lib/db/plans";
import { getTaskTemplates } from "@/lib/db/taskTemplates";
import { getNonDoneAdhocTasks } from "@/lib/db/tasks";
import PlanForm from "@/features/kanban/components/plan/PlanForm";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const [plan, templates, allAdhocTasks] = await Promise.all([
    getPlanWithTemplates(userId, id),
    getTaskTemplates(userId),
    getNonDoneAdhocTasks(userId),
  ]);

  if (!plan) {
    notFound();
  }

  const initialPlanTemplates = plan.planTemplates.map((pt) => ({
    templateId: pt.templateId,
    type: pt.type,
    frequency: pt.frequency,
  }));

  // Only this plan's ad-hoc tasks are editable here (deselect → back to the
  // matrix). Unassigned tasks are tracked from the priority matrix instead.
  const adhocTasks = allAdhocTasks.filter((t) => t.planId === id);
  const initialAdhocTaskIds = adhocTasks.map((t) => t.id);

  return (
    <PlanForm
      templates={templates}
      mode="edit"
      planId={id}
      initialPlanTemplates={initialPlanTemplates}
      initialDescription={plan.description ?? ""}
      initialPlanMode={plan.mode}
      adhocTasks={adhocTasks}
      initialAdhocTaskIds={initialAdhocTaskIds}
    />
  );
}
