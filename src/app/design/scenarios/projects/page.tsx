import {ProjectsScreen} from '@/components/domain/projects/ProjectsScreen';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {ProjectFormScenario} from './ProjectFormScenario';
import {StepFormScenario} from './StepFormScenario';
import {
  ADD_STEP_NUMBER,
  EDIT_PROJECT,
  EDIT_STEP,
  EDIT_STEP_PROJECT,
  FINANCE_ID,
  PROTEIN_ID,
  SCENARIO_ACTIVE_PLAN_ID,
  SCENARIO_PROJECTS,
  SCENARIO_STEPS,
  STEP_MODAL_PROJECT,
  projectsLedBy,
  UNSCHEDULED_STEPS,
} from './fixtures';

const PROJECTS_SCENARIOS: ScenarioTab[] = [
  {
    label: 'No projects',
    title: 'No projects yet',
    note: 'First visit: the Plan hub header (Projects active) over the empty state — New project, and a pointer to Claude for drafting a whole project.',
    content: (
      <ProjectsScreen
        projects={[]}
        steps={[]}
        activePlanId={SCENARIO_ACTIVE_PLAN_ID}
      />
    ),
  },
  {
    label: 'Projects',
    title: 'Projects — list + detail',
    note: "/kanban/projects: active projects with progress, the next step and how many are on this week (one in progress, one all done, one with no steps yet), the Archived section below; the first project's path beside the list. Mobile shows the list only — narrow the window.",
    content: (
      <ProjectsScreen
        projects={SCENARIO_PROJECTS}
        steps={SCENARIO_STEPS}
        activePlanId={SCENARIO_ACTIVE_PLAN_ID}
      />
    ),
  },
  {
    label: 'All steps done',
    title: 'All steps done',
    note: 'Every step of Finance basics is done: the card says so in place of Next, and the detail offers the two ways on — add the next steps, or Archive.',
    content: (
      <ProjectsScreen
        projects={projectsLedBy(FINANCE_ID)}
        steps={SCENARIO_STEPS}
        activePlanId={SCENARIO_ACTIVE_PLAN_ID}
      />
    ),
  },
  {
    label: 'All steps done · archive armed',
    title: 'All steps done — Archive armed',
    note: "A play step clicks the banner's Archive: it turns into Archive? with what it does beside it; a second click archives.",
    content: (
      <ProjectsScreen
        projects={projectsLedBy(FINANCE_ID)}
        steps={SCENARIO_STEPS}
        activePlanId={SCENARIO_ACTIVE_PLAN_ID}
      />
    ),
    play: [{click: {label: 'Projects.Detail.archive'}}],
  },
  {
    label: 'No plan this week',
    title: 'No plan this week',
    note: "Before this week's plan exists: the warning banner with Create plan, and + This week disabled on every upcoming step.",
    content: (
      <ProjectsScreen
        projects={SCENARIO_PROJECTS}
        steps={UNSCHEDULED_STEPS}
        activePlanId={null}
      />
    ),
  },
  {
    label: 'Between weeks',
    title: 'Between weeks — last week not planned over yet',
    note: "The new week has no plan yet, so last week's unfinished steps still sit on last week's plan: muted Last week pills, no × — the next plan carries them over or returns them.",
    content: (
      <ProjectsScreen
        projects={projectsLedBy(PROTEIN_ID)}
        steps={SCENARIO_STEPS}
        activePlanId={null}
      />
    ),
  },
  {
    label: 'New project',
    title: 'New Project',
    note: 'The TaskModal shell: the project banner, Title (required) and Goal (optional). Create project stays disabled until the title has text.',
    display: 'fit',
    overlay: true,
    content: <ProjectFormScenario mode="create" />,
  },
  {
    label: 'Edit project',
    title: 'Edit Project',
    note: 'New Project without the banner, prefilled, with Archive on the footer’s left.',
    display: 'fit',
    overlay: true,
    content: <ProjectFormScenario mode="edit" project={EDIT_PROJECT} />,
  },
  {
    label: 'Edit project · archive armed',
    title: 'Edit Project — Archive armed',
    note: 'A play step clicks Archive: Archive? with what it does — unfinished steps leave this week.',
    display: 'fit',
    overlay: true,
    content: <ProjectFormScenario mode="edit" project={EDIT_PROJECT} />,
    play: [{click: {label: 'Projects.ProjectModal.archive'}}],
  },
  {
    label: 'Add step',
    title: 'Add Step',
    note: 'The header names the project and the number the step becomes; Title, Description and Size (S by default, with the effort hint).',
    display: 'fit',
    overlay: true,
    content: (
      <StepFormScenario
        mode="add"
        project={STEP_MODAL_PROJECT}
        stepNumber={ADD_STEP_NUMBER}
      />
    ),
  },
  {
    label: 'Edit step',
    title: 'Edit Step',
    note: 'Prefilled from the step (size S), its number in the header, Delete step on the footer’s left.',
    display: 'fit',
    overlay: true,
    content: (
      <StepFormScenario
        mode="edit"
        project={EDIT_STEP_PROJECT}
        stepNumber={EDIT_STEP.instanceIndex}
        step={EDIT_STEP}
      />
    ),
  },
  {
    label: 'Edit step · delete armed',
    title: 'Edit Step — Delete armed',
    note: 'A play step clicks Delete step: it turns into Delete step?; a second click deletes, and the steps after it move up one.',
    display: 'fit',
    overlay: true,
    content: (
      <StepFormScenario
        mode="edit"
        project={EDIT_STEP_PROJECT}
        stepNumber={EDIT_STEP.instanceIndex}
        step={EDIT_STEP}
      />
    ),
    play: [{click: {label: 'Projects.StepModal.delete'}}],
  },
];

export default function ProjectsScenarioPage() {
  return (
    <ScenarioPage
      title="Projects scenarios"
      description="The real Projects page (Plan hub header + list + detail) fed fixture
        projects, and its New / Edit Project and Add / Edit Step modals. Screens
        are responsive — narrow the window for the mobile list, detail and
        bottom sheets. Dragging a step can't be pinned (the frame swallows
        drag starts)."
    >
      <ScenarioTabs tabs={PROJECTS_SCENARIOS} />
    </ScenarioPage>
  );
}
