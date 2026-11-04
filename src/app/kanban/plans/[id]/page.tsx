import {redirect} from 'next/navigation';
import {fetchEditPlanFormAction} from '@/actions/planActions';
import {PlanForm} from '@/components/domain/plan/PlanForm';
import {BOARD_PATH} from '@/utils/planUtils';

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  const planForm = await fetchEditPlanFormAction(id);

  // Not this week's active plan (an old link, or the week has ended): the
  // board shows the week as it is, with Create plan when there's none
  if (!planForm) redirect(BOARD_PATH);
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
