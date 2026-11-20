import {
  PlanMode,
  PriorityQuadrant,
  TaskType,
  TaskStatus,
  TaskSize,
  SIZE_TO_POINTS,
} from '@/utils/enums';
import type {TaskItem} from '@/lib/db/tasks';
import type {BoardProject} from '@/lib/db/projects';
import type {BoardPlan} from '@/utils/taskUtils';
import {toBoardCards} from '@/utils/boardCardUtils';
import {toBacklogSections} from '@/utils/backlogGroupUtils';
import {getISOWeekKey, getTodayDate} from '@/utils/dateUtils';

/* Board scenario fixtures — the real BoardPage fed fictional weeks that are
   hard to reach against live data. The board draws its rings against the
   real clock, so the fixture week is the viewer's current week: done tasks
   sit on the days before today, and today is wherever the week is. */

const NOW = new Date();
const TODAY = getTodayDate();
/** 0 for Monday … 6 for Sunday */
const TODAY_INDEX = (TODAY.getDay() + 6) % 7;
const SCENARIO_PERIOD_KEY = getISOWeekKey(TODAY);

/**
 * `offset` days from today, never before this week's Monday (early in the
 * week, earlier work lands on Monday).
 */
const clampToWeek = (offset: number) => Math.max(offset, -TODAY_INDEX);
const dayParts = (offset: number) =>
  [TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset] as const;
/** Noon in Los Angeles on the day `offset` days from today, kept in the week. */
const doneOn = (offset: number) =>
  new Date(Date.UTC(...dayParts(clampToWeek(offset)), 20));
/** A daily instance's day, as Prisma returns a DATE (UTC midnight). */
const forDay = (offset: number) =>
  new Date(Date.UTC(...dayParts(clampToWeek(offset))));
const daysAgo = (count: number) => new Date(NOW.getTime() - count * 86_400_000);

/** The active plan: NORMAL mode, one daily habit and three weekly ones. */
export const SCENARIO_PLAN: BoardPlan = {
  periodKey: SCENARIO_PERIOD_KEY,
  mode: PlanMode.NORMAL,
  planTemplates: [
    {templateId: 'tpl-workout', type: TaskType.DAILY, frequency: 1},
    {templateId: 'tpl-leetcode', type: TaskType.WEEKLY, frequency: 3},
    {templateId: 'tpl-read', type: TaskType.WEEKLY, frequency: 2},
    {templateId: 'tpl-design', type: TaskType.WEEKLY, frequency: 1},
  ],
};

let seq = 0;
const task = (overrides: Partial<TaskItem>): TaskItem => ({
  id: `scn-${seq++}`,
  planId: 'scn-plan',
  templateId: null,
  type: TaskType.DAILY,
  title: 'Task',
  description: null,
  size: TaskSize.EXTRA_SMALL,
  points: SIZE_TO_POINTS[TaskSize.EXTRA_SMALL],
  status: TaskStatus.TODO,
  forDate: null,
  periodKey: SCENARIO_PERIOD_KEY,
  quadrant: null,
  instanceIndex: 0,
  projectId: null,
  createdAt: daysAgo(4),
  updatedAt: NOW,
  doneAt: null,
  ...overrides,
});

const sized = (size: TaskSize): Pick<TaskItem, 'size' | 'points'> => ({
  size,
  points: SIZE_TO_POINTS[size],
});

const workout = (overrides: Partial<TaskItem>) =>
  task({
    templateId: 'tpl-workout',
    title: 'Workout',
    description: '45 min — gym or run',
    ...overrides,
  });
const leetcode = (overrides: Partial<TaskItem>) =>
  task({
    templateId: 'tpl-leetcode',
    type: TaskType.WEEKLY,
    title: 'LeetCode',
    description: 'One medium, 45-min timer',
    ...overrides,
  });
const read = (overrides: Partial<TaskItem>) =>
  task({
    templateId: 'tpl-read',
    type: TaskType.WEEKLY,
    title: 'Read',
    ...overrides,
  });
const oneOff = (overrides: Partial<TaskItem>) =>
  task({
    type: TaskType.AD_HOC,
    periodKey: null,
    quadrant: PriorityQuadrant.DO_FIRST,
    ...overrides,
  });
/** A project step on this week: no template, its number is instanceIndex. */
const step = (overrides: Partial<TaskItem>) =>
  task({type: TaskType.PROJECT, periodKey: null, ...overrides});

// ── Projects behind the step cards ───────────────────────────────────────────
// Biomedical course: Lectures 1–2 done in earlier weeks, Lecture 3 done this
// week, Lectures 4–6 staged in the backlog, Lecture 7 not scheduled.
// Protein 3D viewer: step 1 done last week, step 2 in Todo, 3–4 not scheduled.
const BIO_LECTURE_3 = step({
  id: 'scn-step-bio-3',
  projectId: 'prj-bio',
  instanceIndex: 3,
  title: 'Lecture 3 — Membranes',
  status: TaskStatus.DONE,
  doneAt: doneOn(-1),
});
const BIO_LECTURE_4 = step({
  id: 'scn-step-bio-4',
  projectId: 'prj-bio',
  instanceIndex: 4,
  title: 'Lecture 4 — Cell signaling',
  description: 'Watch + one-page notes',
  status: TaskStatus.BACKLOG,
});
const BIO_LECTURE_5 = step({
  id: 'scn-step-bio-5',
  projectId: 'prj-bio',
  instanceIndex: 5,
  title: 'Lecture 5 — Immunity basics',
  description: 'Watch + one-page notes',
  status: TaskStatus.BACKLOG,
});
const BIO_LECTURE_6 = step({
  id: 'scn-step-bio-6',
  projectId: 'prj-bio',
  instanceIndex: 6,
  title: 'Lecture 6 — Neurons',
  description: 'Watch + one-page notes',
  status: TaskStatus.BACKLOG,
});
const PDB_RENDER = step({
  id: 'scn-step-pdb-2',
  projectId: 'prj-pdb',
  instanceIndex: 2,
  title: 'Render it with Mol*',
  description: 'Rotate + zoom works in the page',
  ...sized(TaskSize.MEDIUM),
});

export const SCENARIO_PROJECTS: BoardProject[] = [
  {
    id: 'prj-bio',
    title: 'Biomedical course',
    steps: [
      {id: 'scn-step-bio-1', status: TaskStatus.DONE, instanceIndex: 1},
      {id: 'scn-step-bio-2', status: TaskStatus.DONE, instanceIndex: 2},
      {id: BIO_LECTURE_3.id, status: TaskStatus.DONE, instanceIndex: 3},
      {id: BIO_LECTURE_4.id, status: TaskStatus.BACKLOG, instanceIndex: 4},
      {id: BIO_LECTURE_5.id, status: TaskStatus.BACKLOG, instanceIndex: 5},
      {id: BIO_LECTURE_6.id, status: TaskStatus.BACKLOG, instanceIndex: 6},
      {id: 'scn-step-bio-7', status: TaskStatus.BACKLOG, instanceIndex: 7},
    ],
  },
  {
    id: 'prj-pdb',
    title: 'Protein 3D viewer',
    steps: [
      {id: 'scn-step-pdb-1', status: TaskStatus.DONE, instanceIndex: 1},
      {id: PDB_RENDER.id, status: TaskStatus.TODO, instanceIndex: 2},
      {id: 'scn-step-pdb-3', status: TaskStatus.BACKLOG, instanceIndex: 3},
      {id: 'scn-step-pdb-4', status: TaskStatus.BACKLOG, instanceIndex: 4},
    ],
  },
];

/** The Todo card the selected-card tab selects */
export const TAX_REPORT_ID = 'scn-one-off-tax';

// ── Mid-week, every kind ─────────────────────────────────────────────────────
// Habits carry their week dots — each card rings its own dot: Workout ran
// four days and two days ago, missed the days between (expired, not loaded),
// and today's is open; LeetCode #1 is done. Project steps carry their project
// and the path. One-offs show their quadrant. Today has two one-offs done
// and four cards in Todo.
export const MID_WEEK_TASKS: TaskItem[] = [
  // Todo
  workout({forDate: forDay(0)}),
  leetcode({instanceIndex: 1}),
  PDB_RENDER,
  oneOff({
    id: TAX_REPORT_ID,
    title: 'File tax report',
    description: 'Federal + state, receipts in the blue folder',
    ...sized(TaskSize.SMALL),
  }),
  // Done
  workout({status: TaskStatus.DONE, forDate: forDay(-4), doneAt: doneOn(-4)}),
  workout({status: TaskStatus.DONE, forDate: forDay(-2), doneAt: doneOn(-2)}),
  leetcode({instanceIndex: 0, status: TaskStatus.DONE, doneAt: doneOn(-1)}),
  BIO_LECTURE_3,
  oneOff({
    title: 'Call bank about card',
    status: TaskStatus.DONE,
    doneAt: doneOn(0),
  }),
  oneOff({
    title: 'Return package',
    quadrant: PriorityQuadrant.SQUEEZE_IN,
    status: TaskStatus.DONE,
    doneAt: doneOn(0),
  }),
  // Backlog: staged habit instances and three scheduled steps
  leetcode({instanceIndex: 2, status: TaskStatus.BACKLOG}),
  BIO_LECTURE_4,
  BIO_LECTURE_5,
  BIO_LECTURE_6,
  read({instanceIndex: 0, status: TaskStatus.BACKLOG}),
  read({instanceIndex: 1, status: TaskStatus.BACKLOG}),
  task({
    templateId: 'tpl-design',
    type: TaskType.WEEKLY,
    title: 'System design case',
    description: 'One case study + a one-page diagram',
    status: TaskStatus.BACKLOG,
    ...sized(TaskSize.SMALL),
  }),
];

/**
 * Workout's missed days this week: the ones between its done days (expired,
 * so the board only gets their count), and none before Monday.
 */
export const MID_WEEK_EXPIRED_DAILY_COUNTS: Record<string, number> =
  Object.fromEntries(
    [-3, -1]
      .filter(offset => offset >= -TODAY_INDEX)
      .map(offset => [
        new Date(Date.UTC(...dayParts(offset))).toISOString().slice(0, 10),
        1,
      ]),
  );

// ── The week's work done for today ──────────────────────────────────────────
// Everything pulled for today is in Done, finished just now, so today's ring
// is closed, and the backlog still holds the rest.

export const DAY_CLEAR_TASKS: TaskItem[] = MID_WEEK_TASKS.map(fixtureTask =>
  fixtureTask.status === TaskStatus.TODO
    ? {...fixtureTask, status: TaskStatus.DONE, doneAt: NOW}
    : fixtureTask,
);

// ── Everything on the board ─────────────────────────────────────────────────
// Every staged task pulled onto Todo: the backlog is empty.
export const BACKLOG_CLEAR_TASKS: TaskItem[] = MID_WEEK_TASKS.map(
  fixtureTask =>
    fixtureTask.status === TaskStatus.BACKLOG
      ? {...fixtureTask, status: TaskStatus.TODO}
      : fixtureTask,
);

// ── Mobile backlog scenario inputs ───────────────────────────────────────────
// The inline mobile backlog sheet bypasses BoardPage, so its groups come from
// the same adapters the live board runs, on the same fixture week.
export const BACKLOG_SECTIONS = toBacklogSections(
  toBoardCards(MID_WEEK_TASKS, {
    plan: SCENARIO_PLAN,
    projects: SCENARIO_PROJECTS,
  })[TaskStatus.BACKLOG],
  {plan: SCENARIO_PLAN, projects: SCENARIO_PROJECTS},
);
export const EMPTY_BACKLOG_SECTIONS = toBacklogSections([], {
  plan: SCENARIO_PLAN,
  projects: SCENARIO_PROJECTS,
});
