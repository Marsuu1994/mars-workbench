import BoardHeader from '@/components/domain/shared/BoardHeader';
import PriorityMatrixPage from '@/components/domain/priorities/PriorityMatrixPage';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {MobileTrackPanel} from './MobileTrackPanel';
import {
  MATRIX_TASKS,
  SCENARIO_ACTIVE_PLAN,
  POPOVER_TASK_ID,
  SHEET_TASK,
} from './fixtures';

const MatrixShell = ({
  activePlan,
  initialOpenPopoverTaskId,
}: {
  activePlan: typeof SCENARIO_ACTIVE_PLAN | null;
  initialOpenPopoverTaskId?: string;
}) => (
  <div className="flex flex-col h-full">
    <BoardHeader periodKey={SCENARIO_ACTIVE_PLAN.periodKey} />
    <PriorityMatrixPage
      tasks={MATRIX_TASKS}
      activePlan={activePlan}
      initialOpenPopoverTaskId={initialOpenPopoverTaskId}
    />
  </div>
);

const PRIORITIES_SCENARIOS: ScenarioTab[] = [
  {
    label: 'Matrix',
    title: 'Priority matrix — populated',
    note: 'All four quadrants filled; tracked tasks render dimmed with the This Week tag.',
    content: <MatrixShell activePlan={SCENARIO_ACTIVE_PLAN} />,
  },
  {
    label: 'Track popover',
    title: 'Track this week — popover open',
    note: 'The send button popover pinned open on an untracked card: Todo / In Progress targets.',
    content: (
      <MatrixShell
        activePlan={SCENARIO_ACTIVE_PLAN}
        initialOpenPopoverTaskId={POPOVER_TASK_ID}
      />
    ),
  },
  {
    label: 'No plan',
    title: 'No active plan',
    note: 'Tracking disabled: warning hint bar with the Create Plan link, send buttons in their disabled treatment.',
    content: <MatrixShell activePlan={null} />,
  },
  {
    label: 'Track sheet (mobile)',
    title: 'Track sheet (mobile)',
    note: 'The tap-a-card bottom sheet — summary line plus the two board targets — shown inline (not as a top-layer modal).',
    height: 420,
    content: <MobileTrackPanel task={SHEET_TASK} hasActivePlan />,
  },
  {
    label: 'Track sheet — no plan (mobile)',
    title: 'Track sheet — no plan (mobile)',
    note: 'Same sheet without an active plan: warning note and disabled targets.',
    height: 420,
    content: <MobileTrackPanel task={SHEET_TASK} hasActivePlan={false} />,
  },
];

export default function PrioritiesScenarioPage() {
  return (
    <ScenarioPage
      title="Priorities scenarios"
      description="The real priorities page (BoardHeader + PriorityMatrixPage) fed a
        fixture matrix — tracked states, the track popover, and the no-plan
        fallback. The board with tracked one-off cards lives in the Board
        scenarios; the add-task modal lives in the Task modal scenarios."
    >
      <ScenarioTabs tabs={PRIORITIES_SCENARIOS} />
    </ScenarioPage>
  );
}
