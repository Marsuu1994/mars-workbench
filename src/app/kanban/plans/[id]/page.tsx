import {notFound} from 'next/navigation';
import {fetchEditPlanFormAction} from '@/actions/planActions';
import {PlanForm} from '@/components/domain/plan/PlanForm';

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  const planForm = await fetchEditPlanFormAction(id);

  if (!planForm) {
    notFound();
  }
  const {templates, plan, adhocTasks, projectSteps} = planForm;

  const initialPlanTemplates = plan.planTemplates.map(planTemplate => ({
    templateId: planTemplate.templateId,
    type: planTemplate.type,
    frequency: planTemplate.frequency,
  }));

  // This plan's one-offs (deselect → back to the matrix) and this week's
  // unfinished steps (deselect → back to their project)
  return (
    <PlanForm
      templates={templates}
      mode="edit"
      planId={id}
      initialPlanTemplates={initialPlanTemplates}
      initialDescription={plan.description ?? ''}
      initialPlanMode={plan.mode}
      adhocTasks={adhocTasks}
      initialAdhocTaskIds={adhocTasks.map(task => task.id)}
      projectSteps={projectSteps}
      initialProjectStepIds={projectSteps.map(step => step.id)}
      periodKey={plan.periodKey}
    />
  );
}
