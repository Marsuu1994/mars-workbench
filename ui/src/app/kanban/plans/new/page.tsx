import { getTaskTemplates } from "@/lib/db/taskTemplates";
import { getPlanByStatus, getPlanWithTemplates } from "@/lib/db/plans";
import { PlanStatus } from "@/generated/prisma/client";
import PlanForm from "@/features/kanban/components/PlanForm";

export default async function NewPlanPage() {
  const [templates, pendingPlan] = await Promise.all([
    getTaskTemplates(),
    getPlanByStatus(PlanStatus.PENDING_UPDATE),
  ]);

  const initialPlanTemplates = pendingPlan
    ? (await getPlanWithTemplates(pendingPlan.id))?.planTemplates.map((pt) => ({
        templateId: pt.templateId,
        type: pt.type,
        frequency: pt.frequency,
      })) ?? []
    : [];

  return (
    <PlanForm
      templates={templates}
      mode="create"
      initialPlanTemplates={initialPlanTemplates}
    />
  );
}
