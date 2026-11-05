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
import {toBacklogGroups, toBoardCards} from '@/utils/boardCardUtils';
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
    {templateId: 'tpl-leetcode', type: TaskType.WEEKLY, frequency: 4},
    {templateId: 'tpl-read', type: TaskType.WEEKLY, frequency: 3},
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
    // Planned after Read, before System design: the backlog's habit order
    createdAt: daysAgo(5),
    ...overrides,
  });
const read = (overrides: Partial<TaskItem>) =>
  task({
    templateId: 'tpl-read',
    type: TaskType.WEEKLY,
    title: 'Read',
    description: '30 pages, any book',
    createdAt: daysAgo(6),
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
// week, Lectures 4–6 staged in the backlog, 7–9 not scheduled.
// Protein 3D viewer: step 1 done last week, step 2 in Todo, 3–4 staged.
const BIO_LECTURE_3 = step({
  id: 'scn-step-bio-3',
  projectId: 'prj-bio',
  instanceIndex: 3,
  title: 'Lecture 3 — Membranes',
  status: TaskStatus.DONE,
  doneAt: daysAgo(1),
});
const bioLecture = (instanceIndex: number, title: string) =>
  step({
    id: `scn-step-bio-${instanceIndex}`,
    projectId: 'prj-bio',
    instanceIndex,
    title,
    description: 'Watch + one-page notes',
    status: TaskStatus.BACKLOG,
  });
const BIO_STAGED = [
  bioLecture(4, 'Lecture 4 — Cell signaling'),
  bioLecture(5, 'Lecture 5 — Immunity basics'),
  bioLecture(6, 'Lecture 6 — Neurons'),
];
const PDB_STAGED = [
  step({
    id: 'scn-step-pdb-3',
    projectId: 'prj-pdb',
    instanceIndex: 3,
    title: 'Add residue picking',
    description: 'Click a residue → highlight + label',
    status: TaskStatus.BACKLOG,
    ...sized(TaskSize.MEDIUM),
  }),
  step({
    id: 'scn-step-pdb-4',
    projectId: 'prj-pdb',
    instanceIndex: 4,
    title: 'Deploy the viewer',
    status: TaskStatus.BACKLOG,
    ...sized(TaskSize.MEDIUM),
  }),
];
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
      ...[4, 5, 6, 7, 8, 9].map(instanceIndex => ({
        id: `scn-step-bio-${instanceIndex}`,
        status: TaskStatus.BACKLOG,
        instanceIndex,
      })),
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
// today's is open; LeetCode #1 and Read #1 are done. Project steps carry
// their project, step n/N and the path. One-offs show their quadrant. The
// backlog stages ten tasks in five groups — its badge reads 8+.
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
  read({instanceIndex: 0, status: TaskStatus.DONE, doneAt: daysAgo(2)}),
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
  // Backlog: staged habit instances and this week's steps
  leetcode({instanceIndex: 2, status: TaskStatus.BACKLOG}),
  leetcode({instanceIndex: 3, status: TaskStatus.BACKLOG}),
  ...BIO_STAGED,
  ...PDB_STAGED,
  read({instanceIndex: 1, status: TaskStatus.BACKLOG}),
  read({instanceIndex: 2, status: TaskStatus.BACKLOG}),
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
// The inline mobile backlog sheet bypasses BoardPage, so its groups come from
// the same adapters the live board runs, on the same fixture week.
const BACKLOG_CARDS = toBoardCards(MID_WEEK_TASKS, {
  plan: SCENARIO_PLAN,
  projects: SCENARIO_PROJECTS,
})[TaskStatus.BACKLOG];
export const BACKLOG_TASK_COUNT = BACKLOG_CARDS.length;
export const BACKLOG_GROUPS = toBacklogGroups(BACKLOG_CARDS);

/** The queue toggle of the fixture's Biomedical course, by its name. */
export const BIO_QUEUE_TOGGLE_NAME =
  "Show the steps behind Biomedical course's next";
