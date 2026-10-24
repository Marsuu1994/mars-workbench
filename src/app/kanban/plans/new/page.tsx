import {fetchNewPlanFormAction} from '@/actions/planActions';
import {PlanForm} from '@/components/domain/plan/PlanForm';

export default async function NewPlanPage() {
  const {templates, plan, adhocTasks, projectSteps} =
    await fetchNewPlanFormAction();

  // A pending plan (last week's, ended) seeds the form: its templates, and
  // its one-offs and unfinished steps preselected for carry-over (deselected
  // steps return to their project at the same step number)
  const initialPlanTemplates =
    plan?.planTemplates.map(planTemplate => ({
      templateId: planTemplate.templateId,
      type: planTemplate.type,
      frequency: planTemplate.frequency,
    })) ?? [];

  return (
    <PlanForm
      templates={templates}
      mode="create"
      initialPlanTemplates={initialPlanTemplates}
      initialPlanMode={plan?.mode}
      adhocTasks={adhocTasks}
      initialAdhocTaskIds={adhocTasks.map(task => task.id)}
      projectSteps={projectSteps}
      initialProjectStepIds={projectSteps.map(step => step.id)}
    />
  );
}
