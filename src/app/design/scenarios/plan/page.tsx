import type {ReactNode} from 'react';
import {getTranslations} from 'next-intl/server';
import {Pill} from '@/components/ui/Pill';
import PlanForm from '@/components/domain/plan/PlanForm';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {ReviewChangesScenario} from './ReviewChangesScenario';
import {
  PLAN_TEMPLATES,
  PLAN_INITIAL_TEMPLATES,
  PLAN_ADHOC_TASKS,
  PLAN_INITIAL_ADHOC_IDS,
  PLAN_EDIT_DESCRIPTION,
  PLAN_EDIT_MODE,
  SCENARIO_PERIOD_KEY,
  REVIEW_ADDED,
  REVIEW_REMOVED,
  REVIEW_MODIFIED,
  REVIEW_ADDED_ADHOC,
  REVIEW_REMOVED_ADHOC,
  REVIEW_INCOMPLETE_COUNTS,
} from './fixtures';

export default async function PlanScenarioPage() {
  const t = await getTranslations('Board.Header');

  // Replicates the plans layout chrome (header + scrollable form body) so the
  // framed form is pixel-identical to /kanban/plans/*.
  const planChrome = (children: ReactNode) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 md:py-3 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold">
            <span className="text-success">{t('titlePrefix')}</span>
            {t('titleSuffix')}
          </h1>
          <Pill color="error" size="md" className="rounded-full">
            {t('planningMode')}
          </Pill>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-xl">{children}</div>
      </div>
    </div>
  );

  const PLAN_SCENARIOS: ScenarioTab[] = [
    {
      label: 'Create',
      title: 'Create Weekly Plan',
      note: 'First-plan form: AI assistant entry, plan-mode toggle, selected templates with their config strips, and the one-off task checklist.',
      height: 680,
      content: planChrome(
        <PlanForm
          mode="create"
          templates={PLAN_TEMPLATES}
          initialPlanTemplates={PLAN_INITIAL_TEMPLATES}
          adhocTasks={PLAN_ADHOC_TASKS}
          initialAdhocTaskIds={PLAN_INITIAL_ADHOC_IDS}
          aiContextPlanId="scn-plan"
        />,
      ),
    },
    {
      label: 'Edit',
      title: 'Update Weekly Plan',
      note: 'Mid-week edit: description prefilled, Extreme mode active, existing template configs and one-off selections loaded.',
      height: 680,
      content: planChrome(
        <PlanForm
          mode="edit"
          planId="scn-plan"
          templates={PLAN_TEMPLATES}
          initialPlanTemplates={PLAN_INITIAL_TEMPLATES}
          initialDescription={PLAN_EDIT_DESCRIPTION}
          initialPlanMode={PLAN_EDIT_MODE}
          adhocTasks={PLAN_ADHOC_TASKS}
          initialAdhocTaskIds={PLAN_INITIAL_ADHOC_IDS}
          periodKey={SCENARIO_PERIOD_KEY}
        />,
      ),
    },
    {
      label: 'Review changes',
      title: 'Review Plan Changes',
      note: 'Every change section at once: added / removed / modified templates with incomplete-task impact notes, one-off board changes, and a mode switch.',
      height: 660,
      content: (
        <ReviewChangesScenario
          added={REVIEW_ADDED}
          removed={REVIEW_REMOVED}
          modified={REVIEW_MODIFIED}
          addedAdhoc={REVIEW_ADDED_ADHOC}
          removedAdhoc={REVIEW_REMOVED_ADHOC}
          incompleteCounts={REVIEW_INCOMPLETE_COUNTS}
        />
      ),
    },
  ];

  return (
    <ScenarioPage
      title="Plan scenarios"
      description="The real plan form (create + edit) inside the plans-layout chrome, and
        the review-changes panel with every change type. Screens are responsive —
        narrow the window for the mobile presentation (sticky action bar, sheet
        layouts)."
      maxWidthClass="max-w-4xl"
    >
      <ScenarioTabs tabs={PLAN_SCENARIOS} />
    </ScenarioPage>
  );
}
