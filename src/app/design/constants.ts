import {
  TaskType,
  TaskStatus,
  TaskSize,
  PriorityQuadrant,
  SIZE_TO_POINTS,
} from '@/utils/enums';
import type {TaskItem} from '@/lib/db/tasks';
import type {RiskLevel} from '@/utils/taskUtils';

// ── Page copy ──────────────────────────────────────────────────────────────
/** Title halves — the accent word renders with fx-text-gradient (the
    design system's "gradient on the first word only" restraint rule). */
export const GALLERY_TITLE_ACCENT = 'Design';
export const GALLERY_TITLE_REST = 'Console';
export const GALLERY_SUBTITLE =
  'Mars Workbench design-system primitives — Mission Control HUD. Rendered with sample data; toggle the theme to preview both palettes.';

export const THEME_DARK = 'mars-dark';
export const THEME_LIGHT = 'mars-light';

// ── Shared fixtures ──────────────────────────────────────────────────────────
export const TODAY = new Date();
const YESTERDAY = new Date(TODAY.getTime() - 24 * 60 * 60 * 1000);

/** Every TaskSize in display order, paired with its Fibonacci points. */
export const SIZE_FIXTURES: {size: TaskSize; points: number}[] = [
  TaskSize.EXTRA_SMALL,
  TaskSize.SMALL,
  TaskSize.MEDIUM,
  TaskSize.LARGE,
  TaskSize.EXTRA_LARGE,
].map(size => ({size, points: SIZE_TO_POINTS[size]}));

/** Each task type rendered through the badge. */
export const TYPE_FIXTURES: string[] = [
  TaskType.DAILY,
  TaskType.WEEKLY,
  TaskType.AD_HOC,
];

/** Quick-start chips shown under the assistant welcome message. */
export const SUGGESTION_CHIPS: string[] = [
  'Plan my week',
  'Add a daily habit',
  'Break down a big task',
];

export const LOADING_LABEL = 'Drafting your plan…';

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
    role: 'Violet — the AI channel, WEEKLY',
  },
  {
    name: 'accent',
    swatch: 'bg-accent text-accent-content',
    role: 'Mars signal orange — drop targets',
  },
  {
    name: 'info',
    swatch: 'bg-info text-info-content',
    role: 'Datalink blue — DAILY, week stats',
  },
  {
    name: 'success',
    swatch: 'bg-success text-success-content',
    role: 'Go-green — done, sizes',
  },
  {
    name: 'warning',
    swatch: 'bg-warning text-warning-content',
    role: 'Caution amber — risk, ONCE, points',
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
    {label: 'AI live', className: 'text-secondary', pulse: true},
  ];

/** Raw fx-chip specimens — generic channel names, deliberately NOT the
    TaskType mapping (the real TaskTypeBadge has its own section below). */
export const CHIP_SPECIMENS: {label: string; className: string}[] = [
  {label: 'DATALINK', className: 'text-info'},
  {label: 'AI', className: 'text-secondary'},
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
  createdAt: TODAY,
  updatedAt: TODAY,
  doneAt: null,
  ...overrides,
});

export interface TaskCardFixture {
  label: string;
  task: TaskItem;
  taskType: string;
  riskLevel: RiskLevel;
  frequency: number;
}

export const TASK_CARD_FIXTURES: TaskCardFixture[] = [
  {
    label: 'Default',
    task: baseTask({
      id: 't-default',
      title: 'Review pull requests',
      description: 'Go through the open PRs and leave feedback.',
    }),
    taskType: TaskType.DAILY,
    riskLevel: 'normal',
    frequency: 1,
  },
  {
    label: 'At risk (warning)',
    task: baseTask({
      id: 't-warning',
      title: 'Write weekly summary',
      size: TaskSize.LARGE,
      points: SIZE_TO_POINTS[TaskSize.LARGE],
      type: TaskType.WEEKLY,
    }),
    taskType: TaskType.WEEKLY,
    riskLevel: 'warning',
    frequency: 1,
  },
  {
    label: 'Urgent (danger)',
    task: baseTask({
      id: 't-danger',
      title: 'Ship the release build',
      size: TaskSize.EXTRA_LARGE,
      points: SIZE_TO_POINTS[TaskSize.EXTRA_LARGE],
      type: TaskType.WEEKLY,
    }),
    taskType: TaskType.WEEKLY,
    riskLevel: 'danger',
    frequency: 1,
  },
  {
    label: 'Rollover (overdue daily)',
    task: baseTask({
      id: 't-rollover',
      title: 'Stretch for 10 minutes',
      forDate: YESTERDAY,
      size: TaskSize.EXTRA_SMALL,
      points: SIZE_TO_POINTS[TaskSize.EXTRA_SMALL],
    }),
    taskType: TaskType.DAILY,
    riskLevel: 'normal',
    frequency: 1,
  },
  {
    label: 'Multi-instance (#2)',
    task: baseTask({
      id: 't-instance',
      title: 'Stand-up notes',
      instanceIndex: 1,
      size: TaskSize.SMALL,
      points: SIZE_TO_POINTS[TaskSize.SMALL],
    }),
    taskType: TaskType.DAILY,
    riskLevel: 'normal',
    frequency: 5,
  },
  {
    label: 'Done',
    task: baseTask({
      id: 't-done',
      title: 'Clear inbox',
      status: TaskStatus.DONE,
      doneAt: TODAY,
    }),
    taskType: TaskType.DAILY,
    riskLevel: 'normal',
    frequency: 1,
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

// ── BottomSheet demo fixtures ────────────────────────────────────────────────
export const SHEET_DEMO_TITLE = 'Staged tasks';
export const SHEET_DEMO_OPEN = 'Open bottom sheet';
export const SHEET_DEMO_CLOSE = 'Close';
export const SHEET_DEMO_HINT = 'Pinned subheader — hints live here.';
export const SHEET_DEMO_ROWS = [
  'Row one — sheets scroll internally',
  'Row two — grip, header and subheader stay pinned',
  'Row three',
  'Row four',
  'Row five',
  'Row six',
  'Row seven',
  'Row eight',
];

// ── OverlayShell demo fixtures ───────────────────────────────────────────────
export const SHELL_DEMO_OPEN = 'Open modal shell';
export const SHELL_DEMO_TITLE = 'Responsive shell';
export const SHELL_DEMO_BODY =
  'Bottom sheet below md, centered reticle panel above. Backdrop taps are ignored (dismissOnBackdrop=false) — Esc or the button closes.';
export const SHELL_DEMO_CLOSE_ACTION = 'Close';

// ── Form-kit demo fixtures ───────────────────────────────────────────────────
export const FORM_DEMO_FIELD_LABEL = 'Task title';
export const FORM_DEMO_FIELD_HINT = '(used by the AI assistant)';
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
