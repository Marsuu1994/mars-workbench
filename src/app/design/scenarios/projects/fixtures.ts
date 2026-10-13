import {TaskSize, TaskStatus, TaskType, SIZE_TO_POINTS} from '@/utils/enums';
import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';

/* Projects scenario fixtures — the real ProjectsScreen and the two modal
   panels fed a fictional set of projects. Wednesday Oct 7, week 41
   (Mon Oct 5 – Sun Oct 11). */

/** This week's ACTIVE plan; W40's plan holds the steps done last week. */
export const SCENARIO_ACTIVE_PLAN_ID = 'scn-plan-w41';
const LAST_WEEK_PLAN_ID = 'scn-plan-w40';

const at = (dayOfOctober: number, hour = 18) =>
  new Date(2026, 9, dayOfOctober, hour);

const project = (
  id: string,
  title: string,
  goal: string | null,
  createdOn: number,
  isArchived = false,
): ProjectItem => ({
  id,
  title,
  goal,
  isArchived,
  createdAt: at(createdOn, 9),
  updatedAt: at(createdOn, 9),
});

const step = (
  projectId: string,
  instanceIndex: number,
  title: string,
  size: TaskSize,
  overrides: Partial<TaskItem> = {},
): TaskItem => ({
  id: `${projectId}-step-${instanceIndex}`,
  planId: null,
  templateId: null,
  type: TaskType.PROJECT,
  title,
  description: null,
  size,
  points: SIZE_TO_POINTS[size],
  status: TaskStatus.BACKLOG,
  forDate: null,
  periodKey: null,
  quadrant: null,
  instanceIndex,
  projectId,
  createdAt: at(1, 9),
  updatedAt: at(1, 9),
  doneAt: null,
  ...overrides,
});

/** A step done on a day of October, on the plan of its week. */
const doneOn = (dayOfOctober: number): Partial<TaskItem> => ({
  status: TaskStatus.DONE,
  planId: dayOfOctober >= 5 ? SCENARIO_ACTIVE_PLAN_ID : LAST_WEEK_PLAN_ID,
  doneAt: at(dayOfOctober),
});

const onThisWeek = (
  status: typeof TaskStatus.TODO | typeof TaskStatus.BACKLOG,
): Partial<TaskItem> => ({status, planId: SCENARIO_ACTIVE_PLAN_ID});

export const BIOMEDICAL_ID = 'prj-bio';
export const PROTEIN_ID = 'prj-pdb';
export const FINANCE_ID = 'prj-fin';
const SPANISH_ID = 'prj-spa';
const HOME_OFFICE_ID = 'prj-home';

/** Newest first, as the DAL lists them; the first active one is selected
    (no ?project= in the console's URL). Spanish A1 has no steps yet, Home
    office is archived. */
export const SCENARIO_PROJECTS: ProjectItem[] = [
  project(
    BIOMEDICAL_ID,
    'Biomedical course',
    'Finish the 12-lecture intro series — about an hour each.',
    4,
  ),
  project(
    PROTEIN_ID,
    'Protein 3D viewer',
    'A Next.js page that renders any PDB entry in 3D.',
    3,
  ),
  project(
    FINANCE_ID,
    'Finance basics',
    'Read the three financial statements with confidence.',
    2,
  ),
  project(SPANISH_ID, 'Spanish A1', 'Hold a 5-minute conversation.', 1),
  project(HOME_OFFICE_ID, 'Home office setup', null, 1, true),
];

/** The same projects with one moved to the front, so the page selects it —
    how a tab shows a project other than the newest. */
export const projectsLedBy = (projectId: string): ProjectItem[] => [
  ...SCENARIO_PROJECTS.filter(({id}) => id === projectId),
  ...SCENARIO_PROJECTS.filter(({id}) => id !== projectId),
];

const BIOMEDICAL_STEPS: TaskItem[] = [
  step(
    BIOMEDICAL_ID,
    1,
    'Lecture 1 — Intro to the cell',
    TaskSize.EXTRA_SMALL,
    doneOn(5),
  ),
  step(
    BIOMEDICAL_ID,
    2,
    'Lecture 2 — Biochemistry basics',
    TaskSize.EXTRA_SMALL,
    doneOn(6),
  ),
  step(BIOMEDICAL_ID, 3, 'Lecture 3 — Membranes', TaskSize.EXTRA_SMALL, {
    description: 'Watch + one-page notes',
    ...onThisWeek(TaskStatus.TODO),
  }),
  step(BIOMEDICAL_ID, 4, 'Lecture 4 — Cell signaling', TaskSize.EXTRA_SMALL),
  step(BIOMEDICAL_ID, 5, 'Lecture 5 — Genetics I', TaskSize.EXTRA_SMALL),
];

const PROTEIN_STEPS: TaskItem[] = [
  step(
    PROTEIN_ID,
    1,
    'Fetch one structure from RCSB PDB',
    TaskSize.SMALL,
    doneOn(1),
  ),
  step(PROTEIN_ID, 2, 'Render it with Mol*', TaskSize.MEDIUM, {
    description: 'Rotate + zoom works in the page',
    ...onThisWeek(TaskStatus.TODO),
  }),
  step(
    PROTEIN_ID,
    3,
    'Color-by-chain toggle',
    TaskSize.SMALL,
    onThisWeek(TaskStatus.BACKLOG),
  ),
  step(PROTEIN_ID, 4, 'Search box for PDB IDs', TaskSize.SMALL, {
    description: 'Type an ID, load the structure',
  }),
];

// Every step done: the All steps done state
const FINANCE_STEPS: TaskItem[] = [
  step(FINANCE_ID, 1, 'Income statement overview', TaskSize.SMALL, doneOn(6)),
  step(FINANCE_ID, 2, 'Balance sheet overview', TaskSize.SMALL, doneOn(7)),
];

const HOME_OFFICE_STEPS: TaskItem[] = [
  step(HOME_OFFICE_ID, 1, 'Pick a desk', TaskSize.SMALL, doneOn(1)),
  step(HOME_OFFICE_ID, 2, 'Monitor arm', TaskSize.EXTRA_SMALL, doneOn(1)),
  step(HOME_OFFICE_ID, 3, 'Cable tray', TaskSize.SMALL),
];

export const SCENARIO_STEPS: TaskItem[] = [
  ...BIOMEDICAL_STEPS,
  ...PROTEIN_STEPS,
  ...FINANCE_STEPS,
  ...HOME_OFFICE_STEPS,
];

/** No plan was ever made for these steps: the open ones are all upcoming. */
export const UNSCHEDULED_STEPS: TaskItem[] = SCENARIO_STEPS.map(projectStep =>
  projectStep.status === TaskStatus.DONE
    ? projectStep
    : {...projectStep, planId: null, status: TaskStatus.BACKLOG},
);

// ── Modal panels ─────────────────────────────────────────────────────────────

export const EDIT_PROJECT = SCENARIO_PROJECTS[0];
export const STEP_MODAL_PROJECT = {
  id: BIOMEDICAL_ID,
  title: 'Biomedical course',
};
/** Add Step on Biomedical course: the new step becomes step 6. */
export const ADD_STEP_NUMBER = BIOMEDICAL_STEPS.length + 1;
/** Edit Step: Protein 3D viewer's step 4, size S. */
export const EDIT_STEP = PROTEIN_STEPS[3];
export const EDIT_STEP_PROJECT = {id: PROTEIN_ID, title: 'Protein 3D viewer'};
