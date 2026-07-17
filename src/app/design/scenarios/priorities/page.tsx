import {PriorityQuadrant} from '@/utils/enums';
import {PrioritiesScreen} from '@/components/domain/priorities/PrioritiesScreen';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {TaskModalScenario} from '../TaskModalScenario';
import {MobileTrackPanel} from './MobileTrackPanel';
import {
  MATRIX_TASKS,
  SCENARIO_ACTIVE_PLAN,
  POPOVER_TASK_ID,
  SHEET_TASK,
} from './fixtures';

const PRIORITIES_SCENARIOS: ScenarioTab[] = [
  {
    label: 'Matrix',
    title: 'Priority matrix — populated',
    note: 'All four quadrants filled; tracked tasks render dimmed with the This Week tag.',
    content: (
      <PrioritiesScreen
        periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
        tasks={MATRIX_TASKS}
        activePlan={SCENARIO_ACTIVE_PLAN}
      />
    ),
  },
  {
    label: 'Track popover',
    title: 'Track this week — popover open',
    note: 'The send button popover pinned open on an untracked card: Todo / In Progress targets.',
    content: (
      <PrioritiesScreen
        periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
        tasks={MATRIX_TASKS}
        activePlan={SCENARIO_ACTIVE_PLAN}
        initialOpenPopoverTaskId={POPOVER_TASK_ID}
      />
    ),
  },
  {
    label: 'No plan',
    title: 'No active plan',
    note: 'Tracking disabled: warning hint bar with the Create Plan link, send buttons in their disabled treatment.',
    content: (
      <PrioritiesScreen
        periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
        tasks={MATRIX_TASKS}
        activePlan={null}
      />
    ),
  },
  {
    label: 'Track sheet (mobile)',
    title: 'Track sheet (mobile)',
    note: 'The tap-a-card bottom sheet — summary line plus the two board targets — shown inline (not as a top-layer modal).',
    display: 'fit',
    content: <MobileTrackPanel task={SHEET_TASK} hasActivePlan />,
  },
  {
    label: 'Track sheet — no plan (mobile)',
    title: 'Track sheet — no plan (mobile)',
    note: 'Same sheet without an active plan: warning note and disabled targets.',
    display: 'fit',
    content: <MobileTrackPanel task={SHEET_TASK} hasActivePlan={false} />,
  },
  {
    label: 'Add priority task',
    title: 'Add priority task — quadrant preset',
    note: 'Desktop per-quadrant entry: one-off info banner, XS default size, the task lands in the quadrant whose + was clicked (no picker).',
    display: 'fit',
    overlay: true,
    content: (
      <TaskModalScenario mode="adhoc" quadrant={PriorityQuadrant.DO_FIRST} />
    ),
  },
  {
    label: 'Add priority task — picker',
    title: 'Add priority task — quadrant picker',
    note: 'Mobile global-add entry: no source quadrant, so the 2×2 picker shows with Schedule preselected.',
    display: 'fit',
    overlay: true,
    content: <TaskModalScenario mode="adhoc" />,
  },
];

export default function PrioritiesScenarioPage() {
  return (
    <ScenarioPage
      title="Priorities scenarios"
      description="The real priorities page (BoardHeader + PriorityMatrixPage) fed a
        fixture matrix — tracked states, the track popover, the no-plan
        fallback, and the add-task modal in both entry modes. The board with
        tracked one-off cards lives in the Board scenarios."
    >
      <ScenarioTabs tabs={PRIORITIES_SCENARIOS} />
    </ScenarioPage>
  );
}
