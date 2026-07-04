import { getTaskTemplates } from "@/lib/db/taskTemplates";
import { getPlanByStatus, getPlanWithTemplates } from "@/lib/db/plans";
import { getNonDoneAdhocTasks } from "@/lib/db/tasks";
import { PlanStatus } from "@/generated/prisma/client";
import { ensureSynced } from "@/services/syncService";
import PlanForm from "@/components/plan/PlanForm";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export default async function NewPlanPage() {
  const userId = await getCurrentUserId();
  // Flip an ended ACTIVE plan to PENDING_UPDATE first, so a direct landing
  // here after week rollover sees the pending plan's templates/ad-hoc tasks
  // and plan creation isn't blocked by a stale ACTIVE plan.
  await ensureSynced(userId);

  const [templates, pendingPlan, allAdhocTasks] = await Promise.all([
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

  // Only the pending plan's ad-hoc tasks are offered for carry-over
  // (preselected). Unassigned tasks live on the priority matrix and reach
  // the board via its Track This Week flow instead.
  const adhocTasks = pendingPlan
    ? allAdhocTasks.filter((t) => t.planId === pendingPlan.id)
    : [];
  const initialAdhocTaskIds = adhocTasks.map((t) => t.id);

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
