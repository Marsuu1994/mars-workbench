import type {ThemeName} from '@/utils/theme';

import {
  TaskType,
  TaskStatus,
  TaskSize,
  PriorityQuadrant,
  SIZE_TO_POINTS,
} from '@/utils/enums';
import type {TaskItem} from '@/lib/db/tasks';
import type {DumpEntryItem} from '@/lib/db/dumpEntries';
import {TaskKind, type HabitWeek} from '@/utils/taskUtils';
import type {BoardCard, ProjectStepContext} from '@/utils/boardCardUtils';
import type {BoardPageContextValue} from '@/components/domain/board/BoardPageContext';
import type {ProjectsPageContextValue} from '@/components/domain/projects/ProjectsPageContext';

// ── Page copy ──────────────────────────────────────────────────────────────
/** Title halves — the accent word renders with fx-text-gradient (the
    design system's "gradient on the first word only" restraint rule). */
export const GALLERY_TITLE_ACCENT = 'Design';
export const GALLERY_TITLE_REST = 'Console';
export const GALLERY_SUBTITLE =
  'Mars Workbench design-system primitives — Mission Control HUD, indexed by component layer. Rendered with sample data; cycle the theme to preview all three (Sora dark → Sora light → P5 dark).';

/** Theme preview cycle for the floating toggle (click = next, wraps). */
export const THEME_CYCLE: ThemeName[] = ['mars-dark', 'mars-light', 'p5-dark'];
export const THEME_CYCLE_LABELS: Record<ThemeName, string> = {
  'mars-dark': 'Sora dark',
  'mars-light': 'Sora light',
  'p5-dark': 'P5 dark',
};

/** ConfirmButton specimen copy. */
export const CONFIRM_DEMO_LABEL = 'Delete task';
export const CONFIRM_DEMO_PROMPT = 'Delete task?';
export const CONFIRM_DEMO_CONFIRM = 'Delete';
export const CONFIRM_DEMO_CANCEL = 'Cancel';

/** Layer tabs — mirrors src/components/ (plus the token/FX foundation). */
export const GALLERY_TAB_LABELS = [
  'Tokens & FX',
  'UI',
  'Application',
  'Domain',
] as const;

export const SCENARIOS_HREF = '/design/scenarios';
export const SCENARIO_HREFS = {
  board: '/design/scenarios/board',
  priorities: '/design/scenarios/priorities',
  plan: '/design/scenarios/plan',
  projects: '/design/scenarios/projects',
  dump: '/design/scenarios/dump',
  auth: '/design/scenarios/auth',
} as const;

// ── Shared fixtures ──────────────────────────────────────────────────────────
export const TODAY = new Date();

/** Every TaskSize in display order, paired with its Fibonacci points. */
export const SIZE_FIXTURES: {size: TaskSize; points: number}[] = [
  TaskSize.EXTRA_SMALL,
  TaskSize.SMALL,
  TaskSize.MEDIUM,
  TaskSize.LARGE,
  TaskSize.EXTRA_LARGE,
].map(size => ({size, points: SIZE_TO_POINTS[size]}));

// ── Design-system specimens ──────────────────────────────────────────────────
/** Semantic color tokens; classes are literal so Tailwind can see them. */
export const TOKEN_SWATCHES: {name: string; swatch: string; role: string}[] = [
  {
    name: 'primary',
    swatch: 'bg-primary text-primary-content',
    role: 'Phosphor cyan — actions, telemetry',
  },
  {
    name: 'secondary',
    swatch: 'bg-secondary text-secondary-content',
    role: 'Violet — project steps',
  },
  {
    name: 'accent',
    swatch: 'bg-accent text-accent-content',
    role: 'Mars signal orange — drop targets',
  },
  {
    name: 'info',
    swatch: 'bg-info text-info-content',
    role: 'Datalink blue — one-offs, Todo, week stats',
  },
  {
    name: 'success',
    swatch: 'bg-success text-success-content',
    role: 'Go-green — habits, done',
  },
  {
    name: 'warning',
    swatch: 'bg-warning text-warning-content',
    role: 'Caution amber — caution, points',
  },
  {
    name: 'error',
    swatch: 'bg-error text-error-content',
    role: 'Abort red — urgent, destructive',
  },
  {
    name: 'neutral',
    swatch: 'bg-neutral text-neutral-content',
    role: 'Console slab — tooltips',
  },
  {
    name: 'base-100',
    swatch: 'bg-base-100 text-base-content border border-base-content/10',
    role: 'Console panel',
  },
  {
    name: 'base-200',
    swatch: 'bg-base-200 text-base-content border border-base-content/10',
    role: 'Deck floor',
  },
  {
    name: 'base-300',
    swatch: 'bg-base-300 text-base-content border border-base-content/10',
    role: 'Inset well',
  },
];

/** Status-LED semantic states. */
export const LED_STATES: {label: string; className: string; pulse: boolean}[] =
  [
    {label: 'On track', className: 'text-success', pulse: false},
    {label: 'At risk', className: 'text-warning', pulse: false},
    {label: 'Overdue', className: 'text-error', pulse: false},
    {label: 'Live', className: 'text-secondary', pulse: true},
  ];

/** Raw fx-chip specimens — generic channel names, deliberately NOT the
    TaskType mapping. */
export const CHIP_SPECIMENS: {label: string; className: string}[] = [
  {label: 'DATALINK', className: 'text-info'},
  {label: 'UPLINK', className: 'text-secondary'},
  {label: 'CAUTION', className: 'text-warning'},
  {label: 'GO', className: 'text-success'},
];

// ── Task card fixtures ───────────────────────────────────────────────────────
const baseTask = (overrides: Partial<TaskItem>): TaskItem => ({
  id: 'sample',
  planId: 'plan-1',
  templateId: null,
  type: TaskType.DAILY,
  title: 'Sample task',
  description: null,
  size: TaskSize.MEDIUM,
  points: 3,
  status: TaskStatus.TODO,
  forDate: null,
  periodKey: null,
  quadrant: null,
  instanceIndex: 0,
  projectId: null,
  createdAt: TODAY,
  updatedAt: TODAY,
  doneAt: null,
  ...overrides,
});

const xs = {
  size: TaskSize.EXTRA_SMALL,
  points: SIZE_TO_POINTS[TaskSize.EXTRA_SMALL],
};

/** A habit's week as toBoardCards computes it: its slots in order (true =
    done). */
const habitWeek = (
  type: TaskType,
  frequency: number,
  slots: boolean[],
): HabitWeek => ({
  type,
  frequency,
  slots,
  done: slots.filter(Boolean).length,
  target: slots.length,
});

// LeetCode 3× / week: #1 done, the Todo card is #2.
const LEETCODE_WEEK = habitWeek(TaskType.WEEKLY, 3, [true, false, false]);
// Workout daily (NORMAL): Mon and Wed done, Tue missed; the Todo card is
// Thursday's, the Done card Wednesday's.
const WORKOUT_WEEK = habitWeek(TaskType.DAILY, 1, [
  true,
  false,
  true,
  false,
  false,
]);
// Read 2× / week, both still in the backlog; the card is #1.
const READ_WEEK = habitWeek(TaskType.WEEKLY, 2, [false, false]);

/** A habit card: its week, and the slot of its own (ringed) dot. */
const habitCard = (
  task: TaskItem,
  week: HabitWeek,
  currentSlot: number,
): BoardCard => ({kind: TaskKind.HABIT, task, habitWeek: week, currentSlot});

const oneOffCard = (task: TaskItem): BoardCard => ({
  kind: TaskKind.ONE_OFF,
  task,
});

/** A step's path as toBoardCards computes it (true = done); the step's own
    segment is its number's. */
const stepContext = (
  projectTitle: string,
  number: number,
  path: boolean[],
): ProjectStepContext => ({
  projectTitle,
  number,
  count: path.length,
  path,
  currentSegment: number - 1,
});

// Protein 3D viewer: step 1 done, the Todo card is step 2 of 4.
const PROTEIN_PATH = [true, false, false, false];
// Biomedical course: Lectures 1–3 done, 4 is staged, 5 not scheduled.
const BIOMEDICAL_PATH = [true, true, true, false, false];

/** A project step card: its project, number and path. */
const projectStepCard = (
  task: TaskItem,
  step: ProjectStepContext,
): BoardCard => ({kind: TaskKind.PROJECT, task, step});

const stepTask = (overrides: Partial<TaskItem>): TaskItem =>
  baseTask({type: TaskType.PROJECT, ...overrides});

export interface TaskCardFixture {
  label: string;
  card: BoardCard;
}

/** Every kind in every place it can sit (a one-off never reaches the
    backlog — Track This Week sends it straight to Todo). */
export const TASK_CARD_FIXTURES: TaskCardFixture[] = [
  {
    label: 'Habit · Todo (weekly)',
    card: habitCard(
      baseTask({
        id: 't-habit',
        templateId: 'tpl-leetcode',
        type: TaskType.WEEKLY,
        title: 'LeetCode',
        description: 'One medium, 45-min timer',
        ...xs,
      }),
      LEETCODE_WEEK,
      1,
    ),
  },
  {
    label: 'Habit · Todo (daily)',
    card: habitCard(
      baseTask({
        id: 't-daily',
        templateId: 'tpl-workout',
        title: 'Workout',
        description: '45 min — gym or run',
        forDate: TODAY,
        ...xs,
      }),
      WORKOUT_WEEK,
      3,
    ),
  },
  {
    label: 'Habit · Backlog',
    card: habitCard(
      baseTask({
        id: 't-backlog',
        templateId: 'tpl-read',
        type: TaskType.WEEKLY,
        title: 'Read',
        status: TaskStatus.BACKLOG,
        ...xs,
      }),
      READ_WEEK,
      0,
    ),
  },
  {
    label: 'Habit · Done',
    card: habitCard(
      baseTask({
        id: 't-habit-done',
        templateId: 'tpl-workout',
        title: 'Workout',
        description: '45 min — gym or run',
        status: TaskStatus.DONE,
        forDate: TODAY,
        doneAt: TODAY,
        ...xs,
      }),
      WORKOUT_WEEK,
      2,
    ),
  },
  {
    label: 'Project step · Todo',
    card: projectStepCard(
      stepTask({
        id: 't-step',
        projectId: 'prj-pdb',
        instanceIndex: 2,
        title: 'Render it with Mol*',
        description: 'Rotate + zoom works in the page',
      }),
      stepContext('Protein 3D viewer', 2, PROTEIN_PATH),
    ),
  },
  {
    label: 'Project step · Backlog',
    card: projectStepCard(
      stepTask({
        id: 't-step-backlog',
        projectId: 'prj-bio',
        instanceIndex: 4,
        title: 'Lecture 4 — Cell signaling',
        description: 'Watch + one-page notes',
        status: TaskStatus.BACKLOG,
        ...xs,
      }),
      stepContext('Biomedical course', 4, BIOMEDICAL_PATH),
    ),
  },
  {
    label: 'Project step · Done',
    card: projectStepCard(
      stepTask({
        id: 't-step-done',
        projectId: 'prj-bio',
        instanceIndex: 3,
        title: 'Lecture 3 — Membranes',
        status: TaskStatus.DONE,
        doneAt: TODAY,
        ...xs,
      }),
      stepContext('Biomedical course', 3, BIOMEDICAL_PATH),
    ),
  },
  {
    label: 'One-off · Todo',
    card: oneOffCard(
      baseTask({
        id: 't-oneoff',
        type: TaskType.AD_HOC,
        title: 'File tax report',
        quadrant: PriorityQuadrant.DO_FIRST,
        size: TaskSize.SMALL,
        points: SIZE_TO_POINTS[TaskSize.SMALL],
      }),
    ),
  },
  {
    label: 'One-off · Done',
    card: oneOffCard(
      baseTask({
        id: 't-oneoff-done',
        type: TaskType.AD_HOC,
        title: 'Call bank about card',
        quadrant: PriorityQuadrant.DO_FIRST,
        status: TaskStatus.DONE,
        doneAt: TODAY,
        ...xs,
      }),
    ),
  },
];

/** The 136px mobile-row faces: a weekly and a daily habit, a project step
    and a one-off. */
export const MINI_CARD_FIXTURES: TaskCardFixture[] = [
  TASK_CARD_FIXTURES[0],
  TASK_CARD_FIXTURES[1],
  TASK_CARD_FIXTURES[4],
  TASK_CARD_FIXTURES[7],
];

/** StepPath specimens: path lengths and where the card's step sits. */
export const STEP_PATH_FIXTURES: {label: string; step: ProjectStepContext}[] = [
  {
    label: 'Step 2 of 4',
    step: stepContext('Protein 3D viewer', 2, PROTEIN_PATH),
  },
  {
    label: 'Step 3 of 5 · done',
    step: stepContext('Biomedical course', 3, BIOMEDICAL_PATH),
  },
  {
    label: 'Step 6 of 12 · done out of order',
    step: stepContext(
      'Spanish A1',
      6,
      Array.from({length: 12}, (_, index) => index < 4 || index === 7),
    ),
  },
  {
    label: '30 steps · one bar',
    step: stepContext(
      'Anatomy atlas',
      13,
      Array.from({length: 30}, (_, index) => index < 12),
    ),
  },
];

// ── Matrix card fixtures ─────────────────────────────────────────────────────
export interface MatrixCardFixture {
  label: string;
  task: TaskItem;
  isTracked: boolean;
}

export const MATRIX_CARD_FIXTURES: MatrixCardFixture[] = [
  {
    label: 'Default (hover for send)',
    task: baseTask({
      id: 'm-default',
      type: TaskType.AD_HOC,
      title: 'Call dentist',
      description: 'Annual checkup is overdue',
      size: TaskSize.SMALL,
      points: SIZE_TO_POINTS[TaskSize.SMALL],
      status: TaskStatus.BACKLOG,
      planId: null,
      quadrant: PriorityQuadrant.DO_FIRST,
    }),
    isTracked: false,
  },
  {
    label: 'Tracked (This Week)',
    task: baseTask({
      id: 'm-tracked',
      type: TaskType.AD_HOC,
      title: 'Shop birthday gift',
      description: 'For mom — this Saturday',
      status: TaskStatus.TODO,
      quadrant: PriorityQuadrant.DO_FIRST,
    }),
    isTracked: true,
  },
];

// ── Progress dashboard fixture ───────────────────────────────────────────────
export const PROGRESS_FIXTURE = {
  todayDoneCount: 4,
  todayTotalCount: 6,
  todayDonePoints: 11,
  todayTotalPoints: 17,
  weekDoneCount: 18,
  weekProjectedCount: 30,
  weekDonePoints: 47,
  weekProjectedPoints: 82,
  daysElapsed: 3,
};

// ── ui/Pill fixtures ─────────────────────────────────────────────────────────
export const PILL_COLORS = [
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
] as const;

export const PILL_SIZES = ['xs', 'sm', 'md'] as const;

// ── OverlayHeader demo fixtures ──────────────────────────────────────────────
export const HEADER_DEMO_TITLE = 'Staged tasks';
export const HEADER_DEMO_CLOSE = 'Close';
export const HEADER_DEMO_BADGE = '3';
export const HEADER_DEMO_SUBTITLE_TITLE = 'Add Step';
export const HEADER_DEMO_SUBTITLE = 'Biomedical course · becomes step 4';

// ── OverlayShell demo fixtures ───────────────────────────────────────────────
export const SHELL_DEMO_OPEN = 'Open modal shell';
export const SHELL_DEMO_TITLE = 'Responsive shell';
export const SHELL_DEMO_BODY =
  'Bottom sheet below md, centered reticle panel above. Backdrop taps are ignored (dismissOnBackdrop=false) — Esc or the button closes.';
export const SHELL_DEMO_CLOSE_ACTION = 'Close';

// ── Form-kit demo fixtures ───────────────────────────────────────────────────
export const FORM_DEMO_FIELD_LABEL = 'Task title';
export const FORM_DEMO_FIELD_HINT = '(read by Claude when planning)';
export const FORM_DEMO_FIELD_PLACEHOLDER = 'e.g. Review pull requests';
export const FORM_DEMO_CHOICE_LABEL = 'Recurrence';
export const FORM_DEMO_CHOICES = [
  {value: 'daily', label: 'Daily'},
  {value: 'weekly', label: 'Weekly'},
  {value: 'adhoc', label: 'Once'},
] as const;
export const FORM_DEMO_STEP_LABEL = 'Frequency';
export const FORM_DEMO_STEP_DEC = 'Decrease';
export const FORM_DEMO_STEP_INC = 'Increase';
export const FORM_DEMO_STEP_MIN = 1;
export const FORM_DEMO_STEP_MAX = 7;
export const FORM_DEMO_SUBMIT = 'Save task';
export const FORM_DEMO_ERROR = 'Title is required';

// ── Content-block demo fixtures ──────────────────────────────────────────────
export const CONTENT_STATS = [
  {value: '47 / 82', valueClass: 'text-lg text-success', label: 'Today points'},
  {value: '18 / 30', valueClass: 'text-lg text-info', label: 'Week points'},
  {value: '15.7', valueClass: 'text-lg text-warning', label: 'Daily avg'},
] as const;
export const CONTENT_BARS = [
  {value: 72, fill: 'bg-success', label: 'Today'},
  {value: 60, fill: 'bg-info', label: 'Week'},
  {
    value: 88,
    fill: 'bg-gradient-to-r from-info to-success',
    label: 'Projected',
  },
] as const;
export const CONTENT_SECTION_LABELS = [
  'Week progress',
  'Track to',
  'Plan mode',
];

// ── Domain specimen fixtures (Phase 7) ───────────────────────────────────────
/** BoardHeader shows the desktop/mobile accent drift — documented, not fixed. */
export const BOARD_HEADER_PERIOD = '2026-W28';

/** A Todo column: a weekly habit, a daily habit, a project step and a
    one-off. */
export const BOARD_COLUMN_STATUS = TaskStatus.TODO;
export const BOARD_COLUMN_CARDS: BoardCard[] = MINI_CARD_FIXTURES.map(
  fixture => fixture.card,
);

/** PlanTaskRow — tasks already on the plan the form keeps or lets go. */
export const PLAN_TASK_ROW_FIXTURES = [
  {
    label: 'One-off · selected',
    kind: TaskKind.ONE_OFF,
    title: 'File tax report',
    size: TaskSize.SMALL,
    status: TaskStatus.TODO,
    isSelected: true,
    returnsTo: 'Priorities matrix',
  },
  {
    label: 'Project step · selected',
    kind: TaskKind.PROJECT,
    title: 'Render it with Mol*',
    context: 'Protein 3D viewer',
    size: TaskSize.MEDIUM,
    status: TaskStatus.TODO,
    isSelected: true,
    returnsTo: 'Protein 3D viewer, step 2',
  },
  {
    label: 'Project step · deselected',
    kind: TaskKind.PROJECT,
    title: 'Income statement overview',
    context: 'Finance basics',
    size: TaskSize.SMALL,
    status: TaskStatus.BACKLOG,
    isSelected: false,
    returnsTo: 'Finance basics, step 1',
  },
] as const;

// ── Projects fixtures ────────────────────────────────────────────────────────

/** The plan this week's step specimens sit on. */
const GALLERY_ACTIVE_PLAN_ID = 'gallery-plan-w41';

const lectureStep = (overrides: Partial<TaskItem>): TaskItem =>
  stepTask({
    projectId: 'gallery-prj-bio',
    planId: null,
    status: TaskStatus.BACKLOG,
    ...xs,
    ...overrides,
  });

/** ProjectStep — every place a step sits, plus an upcoming step with no
    plan to schedule into. */
export const PROJECT_STEP_FIXTURES: {
  label: string;
  step: TaskItem;
  activePlanId: string | null;
}[] = [
  {
    label: 'Done',
    activePlanId: GALLERY_ACTIVE_PLAN_ID,
    step: lectureStep({
      id: 'gallery-step-2',
      title: 'Lecture 2 — Biochemistry basics',
      instanceIndex: 2,
      planId: GALLERY_ACTIVE_PLAN_ID,
      status: TaskStatus.DONE,
      doneAt: new Date(2026, 9, 6, 18),
    }),
  },
  {
    label: 'This week · todo',
    activePlanId: GALLERY_ACTIVE_PLAN_ID,
    step: lectureStep({
      id: 'gallery-step-3',
      title: 'Lecture 3 — Membranes',
      description: 'Watch + one-page notes',
      instanceIndex: 3,
      planId: GALLERY_ACTIVE_PLAN_ID,
      status: TaskStatus.TODO,
    }),
  },
  {
    label: 'This week · backlog',
    activePlanId: GALLERY_ACTIVE_PLAN_ID,
    step: lectureStep({
      id: 'gallery-step-4',
      title: 'Lecture 4 — Cell signaling',
      instanceIndex: 4,
      planId: GALLERY_ACTIVE_PLAN_ID,
    }),
  },
  {
    label: 'Last week',
    // Between weeks: no plan yet, the step still on last week's
    activePlanId: null,
    step: lectureStep({
      id: 'gallery-step-4-last',
      title: 'Lecture 4 — Cell signaling',
      instanceIndex: 4,
      planId: 'gallery-plan-w40',
      status: TaskStatus.TODO,
    }),
  },
  {
    label: 'Upcoming',
    activePlanId: GALLERY_ACTIVE_PLAN_ID,
    step: lectureStep({
      id: 'gallery-step-5',
      title: 'Lecture 5 — Genetics I',
      instanceIndex: 5,
    }),
  },
  {
    label: 'Upcoming · no plan',
    activePlanId: null,
    step: lectureStep({
      id: 'gallery-step-5-no-plan',
      title: 'Lecture 5 — Genetics I',
      instanceIndex: 5,
    }),
  },
];

/** The page context a ProjectStep specimen renders in, outside the Projects
    page: the fixture's plan, inert handlers (the frame swallows clicks). */
export const inertProjectsPageContext = (
  activePlanId: string | null,
): ProjectsPageContextValue => ({
  activePlanId,
  showProject: () => undefined,
  showProjectList: () => undefined,
  openNewProject: () => undefined,
  openEditProject: () => undefined,
  openAddStep: () => undefined,
  openEditStep: () => undefined,
  scheduleStep: () => undefined,
  takeStepBack: () => undefined,
  moveStep: () => undefined,
  archiveProject: async () => undefined,
  unarchiveProject: async () => undefined,
});

/** The page context a MobileBacklogCard renders in, outside the board page:
    inert handlers (the frame swallows clicks). */
export const inertBoardPageContext = (): BoardPageContextValue => ({
  pullToTodo: () => undefined,
});

/** TemplateItem — a single selectable plan-template row. */
export const TEMPLATE_FIXTURE = {
  id: 'tmpl-1',
  userId: 'user-1',
  title: 'Morning workout',
  description: 'A short routine to start the day.',
  size: TaskSize.SMALL,
  isArchived: false,
  createdAt: TODAY,
  updatedAt: TODAY,
};

// ── Dump card fixtures ───────────────────────────────────────────────────────
/** DumpEntryCard specimens — a short entry and a long (>6 line) one that
    clamps with the Show more toggle. */
export const DUMP_CARD_FIXTURES: {label: string; entry: DumpEntryItem}[] = [
  {
    label: 'Short',
    entry: {
      id: 'dump-short',
      content: 'Book the dentist before the calendar fills up.',
      createdAt: TODAY,
    },
  },
  {
    label: 'Long (clamped)',
    entry: {
      id: 'dump-long',
      content: `Long walk after dinner. The week finally feels like it has a shape — the plan helped more than I expected. I keep noticing that the days I write the plan down before 9am are the days I actually finish things. Maybe the ritual matters more than the plan itself.

Also thinking about how much of my anxiety is just unwritten to-dos circling. When they land somewhere — the board, this dump — the volume drops.`,
      createdAt: TODAY,
    },
  },
];

// ── ui/ demo fixtures (EmptyState, TabBar, Popover) ──────────────────────────
export const EMPTY_STATE_DEMO_TITLE = 'No signals yet';
export const EMPTY_STATE_DEMO_DESC =
  'Nothing on this channel. Run a scan to populate the console.';
export const EMPTY_STATE_DEMO_CTA = 'Run scan';

export const TABBAR_DEMO_LABELS = ['Overview', 'Telemetry', 'Logs'];

/** EmptyState inline specimen. */
export const EMPTY_STATE_INLINE_DEMO_TITLE = 'No steps yet';
export const EMPTY_STATE_INLINE_DEMO_DESC =
  'A project is a path of small steps, about 1–3 hours each.';
export const EMPTY_STATE_INLINE_DEMO_CTA = 'Add the first step';

/** Banner specimens — one per tone, with and without an action. */
export const BANNER_DEMO_INTRO =
  'Projects are a goal plus ordered steps — steps go onto a week one at a time and never expire.';
export const BANNER_DEMO_DONE_TITLE = 'All steps done';
export const BANNER_DEMO_DONE =
  "Add the next steps below, or archive the project when you're finished.";
export const BANNER_DEMO_ACTION = 'Archive';
export const BANNER_DEMO_SAVED = 'Saved — the board shows the change.';
export const BANNER_DEMO_WARNING =
  'No plan for this week yet — + This week needs one.';
export const BANNER_DEMO_LINK = 'Create plan';

/** InlineConfirmButton specimens. */
export const INLINE_CONFIRM_DEMO_LABEL = 'Delete step';
export const INLINE_CONFIRM_DEMO_CONFIRM = 'Delete step?';

/** ConfirmBar specimens: a bare question, and one that says what happens. */
export const CONFIRM_BAR_DEMO_PROMPT = 'Sign out?';
export const CONFIRM_BAR_DEMO_CANCEL = 'Cancel';
export const CONFIRM_BAR_DEMO_CONFIRM = 'Sign out';
export const CONFIRM_BAR_DEMO_DETAIL_PROMPT = 'Archive Biomedical course?';
export const CONFIRM_BAR_DEMO_DETAIL =
  'It moves to Archived; its unfinished steps leave this week.';
export const CONFIRM_BAR_DEMO_DETAIL_CANCEL = 'Keep';
export const CONFIRM_BAR_DEMO_DETAIL_CONFIRM = 'Archive';

/** ModalFormFooter specimens. */
export const FOOTER_DEMO_CANCEL = 'Cancel';
export const FOOTER_DEMO_SUBMIT = 'Save changes';
export const FOOTER_DEMO_ERROR = 'Title is required';

export const POPOVER_DEMO_ANCHOR = 'Anchor';
export const POPOVER_DEMO_TITLE = 'Move to';
export const POPOVER_DEMO_BODY =
  'Anchored below a relative parent, arrow notch, swallows clicks.';

export const TOAST_DEMO_MESSAGE = 'Marked done · +2 pts this week';
export const TOAST_DEMO_ACTION = 'Undo';
export const TOAST_DEMO_PLAIN = 'Added to Schedule';
export const TOAST_DEMO_DURATION_MS = 5000;

// ── Application-layer fixtures ───────────────────────────────────────────────
export const APP_USER = {name: 'Liang Jun', email: 'liang@example.com'};
export const APP_PLAN_ID = 'gallery-plan';

/** AppSidebar states — the pathname/collapsed values AppShell supplies in the app. */
export const SIDEBAR_VARIANTS: {
  label: string;
  pathname: string;
  activePlanId: string | null;
  collapsed: boolean;
}[] = [
  {
    label: 'Expanded — board active',
    pathname: '/kanban',
    activePlanId: APP_PLAN_ID,
    collapsed: false,
  },
  {
    label: 'Expanded — no plan (New pill)',
    pathname: '/kanban/priorities',
    activePlanId: null,
    collapsed: false,
  },
  {
    label: 'Collapsed',
    pathname: '/kanban',
    activePlanId: APP_PLAN_ID,
    collapsed: true,
  },
];

export const DOCK_DEMO_PATHNAME = '/kanban';
