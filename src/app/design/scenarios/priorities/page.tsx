import {PriorityQuadrant} from '@/utils/enums';
import {PrioritiesScreen} from '@/components/domain/priorities/PrioritiesScreen';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {TaskModalScenario} from '../TaskModalScenario';
import {MobileMoveToPanelScenario} from './MobileMoveToPanelScenario';
import {DoneToastScenario} from './DoneToastScenario';
import {
  MATRIX_TASKS,
  MATRIX_TASKS_AFTER_DONE,
  DONE_TASK,
  SCENARIO_ACTIVE_PLAN,
  POPOVER_TASK_ID,
  TRACKED_POPOVER_TASK_ID,
  SHEET_TASK,
  SHEET_TRACKED_TASK,
  matrixCard,
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
    label: 'Move-to popover',
    title: 'Move to — popover open',
    note: "A play step clicks an untracked card's Move-to button: Todo / In Progress, then Done under a hairline.",
    content: (
      <PrioritiesScreen
        periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
        tasks={MATRIX_TASKS}
        activePlan={SCENARIO_ACTIVE_PLAN}
      />
    ),
    play: [
      {
        click: {
          within: matrixCard(POPOVER_TASK_ID),
          label: 'Priorities.sendLabel',
        },
      },
    ],
  },
  {
    label: 'Move-to popover — tracked',
    title: 'Move to — tracked card',
    note: 'The popover on a This Week card: the column rows drop out, Done is the only move left.',
    content: (
      <PrioritiesScreen
        periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
        tasks={MATRIX_TASKS}
        activePlan={SCENARIO_ACTIVE_PLAN}
      />
    ),
    play: [
      {
        click: {
          within: matrixCard(TRACKED_POPOVER_TASK_ID),
          label: 'Priorities.sendLabel',
        },
      },
    ],
  },
  {
    label: 'No plan',
    title: 'No active plan',
    note: 'Warning hint bar with the Create Plan link; send buttons stay enabled because Done never needs a plan.',
    content: (
      <PrioritiesScreen
        periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
        tasks={MATRIX_TASKS}
        activePlan={null}
      />
    ),
  },
  {
    label: 'Move-to popover — no plan',
    title: 'Move to — no active plan',
    note: 'The same popover without a plan: column rows disabled under the "No active plan yet" note, Done still live.',
    content: (
      <PrioritiesScreen
        periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
        tasks={MATRIX_TASKS}
        activePlan={null}
      />
    ),
    play: [
      {
        click: {
          within: matrixCard(POPOVER_TASK_ID),
          label: 'Priorities.sendLabel',
        },
      },
    ],
  },
  {
    label: 'Done toast',
    title: 'Marked done — undo toast',
    note: 'Right after Done: the card is gone and the Undo toast shows, its countdown held by the frame — credited copy because the active plan absorbed the points. Composed: the toast needs a completion write, which a scenario never makes.',
    content: (
      <>
        <PrioritiesScreen
          periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
          tasks={MATRIX_TASKS_AFTER_DONE}
          activePlan={SCENARIO_ACTIVE_PLAN}
        />
        <DoneToastScenario task={DONE_TASK} credited />
      </>
    ),
  },
  {
    label: 'Done toast — no plan',
    title: 'Marked done — no active plan',
    note: 'The same toast without a plan: plain "Marked done", nothing credited.',
    content: (
      <>
        <PrioritiesScreen
          periodKey={SCENARIO_ACTIVE_PLAN.periodKey}
          tasks={MATRIX_TASKS_AFTER_DONE}
          activePlan={null}
        />
        <DoneToastScenario task={DONE_TASK} credited={false} />
      </>
    ),
  },
  {
    label: 'Move-to sheet (mobile)',
    title: 'Move-to sheet (mobile)',
    note: 'The tap-a-card bottom sheet — summary line plus the two board columns and Done — shown inline (not as a top-layer modal).',
    display: 'fit',
    content: <MobileMoveToPanelScenario task={SHEET_TASK} hasActivePlan />,
  },
  {
    label: 'Move-to sheet — tracked (mobile)',
    title: 'Move-to sheet — tracked card (mobile)',
    note: 'Tapping a ★ card: it is already on the board, so the sheet offers Done only.',
    display: 'fit',
    content: (
      <MobileMoveToPanelScenario
        task={SHEET_TRACKED_TASK}
        isTracked
        hasActivePlan
      />
    ),
  },
  {
    label: 'Move-to sheet — no plan (mobile)',
    title: 'Move-to sheet — no plan (mobile)',
    note: 'Same sheet without an active plan: warning note, disabled column rows, Done still enabled.',
    display: 'fit',
    content: (
      <MobileMoveToPanelScenario task={SHEET_TASK} hasActivePlan={false} />
    ),
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
        fixture matrix — tracked states, the Move-to chooser (popover opened
        by a play step, and the mobile sheet, with and without a plan), the
        undo toast after Done, the no-plan fallback, and the add-task modal in
        both entry modes. The board with tracked one-off cards lives in the
        Board scenarios."
    >
      <ScenarioTabs tabs={PRIORITIES_SCENARIOS} />
    </ScenarioPage>
  );
}
