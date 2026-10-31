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
import type {BoardProgress} from '@/types/board';

/* Board scenario fixtures — the real BoardPage fed fictional weeks that are
   hard to reach against live data. */

// Friday of ISO week 28 (Mon Jul 6 – Sun Jul 12).
const NOW = new Date('2026-07-10T15:00:00');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
/** A daily instance's day, as Prisma returns a DATE (UTC midnight). */
const forDay = (dayOfJuly: number) => new Date(Date.UTC(2026, 6, dayOfJuly));

const SCENARIO_PERIOD_KEY = '2026-W28';

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
// week, Lecture 4 staged in the backlog, Lecture 5 not scheduled.
// Protein 3D viewer: step 1 done last week, step 2 in Todo, 3–4 not scheduled.
const BIO_LECTURE_3 = step({
  id: 'scn-step-bio-3',
  projectId: 'prj-bio',
  instanceIndex: 3,
  title: 'Lecture 3 — Membranes',
  status: TaskStatus.DONE,
  doneAt: daysAgo(1),
});
const BIO_LECTURE_4 = step({
  id: 'scn-step-bio-4',
  projectId: 'prj-bio',
  instanceIndex: 4,
  title: 'Lecture 4 — Cell signaling',
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
      {id: 'scn-step-bio-5', status: TaskStatus.BACKLOG, instanceIndex: 5},
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

// ── Mid-week, every kind ─────────────────────────────────────────────────────
// Habits carry their plan line and week dots — each card rings its own dot:
// Workout ran Mon and Wed, missed Tue and Thu (expired, not loaded), and
// today's is open; LeetCode #1 is done. Project steps carry their project,
// step n/N and the path. One-offs show their quadrant.
export const MID_WEEK_TASKS: TaskItem[] = [
  // Todo
  workout({forDate: forDay(10)}),
  leetcode({instanceIndex: 1}),
  PDB_RENDER,
  oneOff({
    title: 'File tax report',
    description: 'Federal + state, receipts in the blue folder',
    ...sized(TaskSize.SMALL),
  }),
  // Done
  workout({status: TaskStatus.DONE, forDate: forDay(6), doneAt: daysAgo(4)}),
  workout({status: TaskStatus.DONE, forDate: forDay(8), doneAt: daysAgo(2)}),
  leetcode({instanceIndex: 0, status: TaskStatus.DONE, doneAt: daysAgo(1)}),
  BIO_LECTURE_3,
  oneOff({
    title: 'Call bank about card',
    status: TaskStatus.DONE,
    doneAt: daysAgo(0),
  }),
  oneOff({
    title: 'Return package',
    quadrant: PriorityQuadrant.SQUEEZE_IN,
    status: TaskStatus.DONE,
    doneAt: daysAgo(0),
  }),
  // Backlog: staged habit instances and a scheduled step
  leetcode({instanceIndex: 2, status: TaskStatus.BACKLOG}),
  BIO_LECTURE_4,
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

export const MID_WEEK_PROGRESS: BoardProgress = {
  todayDoneCount: 2,
  todayTotalCount: 10,
  todayDonePoints: 2,
  todayTotalPoints: 13,
  weekDoneCount: 6,
  weekProjectedCount: 17,
  weekDonePoints: 6,
  weekProjectedPoints: 21,
  daysElapsed: 5,
};

// ── Mobile backlog scenario inputs ───────────────────────────────────────────
// The inline mobile backlog sheet bypasses BoardPage, so its cards come from
// the same adapter the live board runs, on the same fixture week.
export const BACKLOG_CARDS = toBoardCards(MID_WEEK_TASKS, {
  plan: SCENARIO_PLAN,
  projects: SCENARIO_PROJECTS,
})[TaskStatus.BACKLOG];
