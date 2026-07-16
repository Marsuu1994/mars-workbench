import {PriorityQuadrant} from '@/utils/enums';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {TaskModalScenario} from './TaskModalScenario';
import {EDIT_TEMPLATE} from './fixtures';

const TASK_MODAL_SCENARIOS: ScenarioTab[] = [
  {
    label: 'New template',
    title: 'Create task template',
    note: 'Blank template form: AI-hinted description, size pills defaulting to M.',
    height: 560,
    content: <TaskModalScenario mode="create" />,
  },
  {
    label: 'Edit template',
    title: 'Edit task template',
    note: 'Prefilled from the template; XL size surfaces the split-it-up warning.',
    height: 560,
    content: <TaskModalScenario mode="edit" template={EDIT_TEMPLATE} />,
  },
  {
    label: 'Add priority task',
    title: 'Add priority task — quadrant preset',
    note: 'Desktop per-quadrant entry: one-off info banner, XS default size, the task lands in the quadrant whose + was clicked (no picker).',
    height: 560,
    content: (
      <TaskModalScenario mode="adhoc" quadrant={PriorityQuadrant.DO_FIRST} />
    ),
  },
  {
    label: 'Add priority task — picker',
    title: 'Add priority task — quadrant picker',
    note: 'Mobile global-add entry: no source quadrant, so the 2×2 picker shows with Schedule preselected.',
    height: 660,
    content: <TaskModalScenario mode="adhoc" />,
  },
];

export default function TaskModalScenarioPage() {
  return (
    <ScenarioPage
      title="Task modal scenarios"
      description="The shared task form (TaskModalPanel) across its three contexts —
        template create/edit from the plan form, and the priority-task add from
        the matrix — rendered inline in a modal-box stand-in."
      maxWidthClass="max-w-4xl"
    >
      <ScenarioTabs tabs={TASK_MODAL_SCENARIOS} />
    </ScenarioPage>
  );
}
