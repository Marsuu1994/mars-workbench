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

  const initialSelectedIds = plan.planTemplates.map((pt) => pt.templateId);

  return (
    <PlanForm
      templates={templates}
      mode="edit"
      planId={id}
      initialSelectedIds={initialSelectedIds}
      initialDescription={plan.description ?? ""}
    />
  );
}
