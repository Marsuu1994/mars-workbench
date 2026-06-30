import { getTaskTemplates } from "@/lib/db/taskTemplates";
import { getPlanByStatus, getPlanWithTemplates } from "@/lib/db/plans";
import { getNonDoneAdhocTasks } from "@/lib/db/tasks";
import { PlanStatus } from "@/generated/prisma/client";
import PlanForm from "@/features/kanban/components/plan/PlanForm";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export default async function NewPlanPage() {
  const userId = await getCurrentUserId();

  const [templates, pendingPlan, adhocTasks] = await Promise.all([
    getTaskTemplates(userId),
    getPlanByStatus(userId, PlanStatus.PENDING_UPDATE),
    getNonDoneAdhocTasks(userId),
  ]);

  const initialPlanTemplates = pendingPlan
    ? (await getPlanWithTemplates(userId, pendingPlan.id))?.planTemplates.map((pt) => ({
        templateId: pt.templateId,
        type: pt.type,
        frequency: pt.frequency,
      })) ?? []
    : [];

  // Preselect ad-hoc tasks that belong to the pending plan
  const initialAdhocTaskIds = pendingPlan
    ? adhocTasks.filter((t) => t.planId === pendingPlan.id).map((t) => t.id)
    : [];

  return (
    <PlanForm
      templates={templates}
      mode="create"
      initialPlanTemplates={initialPlanTemplates}
      initialPlanMode={pendingPlan?.mode}
      adhocTasks={adhocTasks}
      initialAdhocTaskIds={initialAdhocTaskIds}
      aiContextPlanId={pendingPlan?.id}
    />
  );
}
