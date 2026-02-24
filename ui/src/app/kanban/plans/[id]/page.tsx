import { notFound } from "next/navigation";
import { getPlanWithTemplates } from "@/lib/db/plans";
import { getTaskTemplates } from "@/lib/db/taskTemplates";
import PlanForm from "@/features/kanban/components/PlanForm";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [plan, templates] = await Promise.all([
    getPlanWithTemplates(id),
    getTaskTemplates(),
  ]);

  if (!plan) {
    notFound();
  }

  const initialPlanTemplates = plan.planTemplates.map((pt) => ({
    templateId: pt.templateId,
    type: pt.type,
    frequency: pt.frequency,
  }));

  return (
    <PlanForm
      templates={templates}
      mode="edit"
      planId={id}
      initialPlanTemplates={initialPlanTemplates}
      initialDescription={plan.description ?? ""}
    />
  );
}
