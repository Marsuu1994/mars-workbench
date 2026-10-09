import {
  PlanMode,
  PriorityQuadrant,
  TaskType,
  TaskStatus,
  TaskSize,
  SIZE_TO_POINTS,
} from '@/utils/enums';
import type {TaskItem} from '@/lib/db/tasks';
import {computeHabitWeeks, type BoardPlan} from '@/utils/taskUtils';

/* Board scenario fixtures — real KanbanBoard + ProgressDashboard fed
   fictional weeks that are hard to reach against live data. */

const NOW = new Date('2026-07-10T15:00:00');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/** The scenario's frozen "today" (midnight) — the inline mobile backlog
    renders its rollover against it so the pinned state never drifts. */
export const SCENARIO_TODAY = new Date('2026-07-10T00:00:00');

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

// ── Mid-week, every kind ─────────────────────────────────────────────────────
// Habits carry their plan line and week dots, one Workout rolled over from
// yesterday (↩ date in the context slot), one-offs show their quadrant.
export const MID_WEEK_TASKS: TaskItem[] = [
  // Todo
  workout({forDate: daysAgo(1)}),
  workout({instanceIndex: 0}),
  leetcode({instanceIndex: 1}),
  oneOff({
    title: 'File tax report',
    description: 'Federal + state, receipts in the blue folder',
    ...sized(TaskSize.SMALL),
  }),
  // Done
  workout({status: TaskStatus.DONE, forDate: daysAgo(2), doneAt: daysAgo(2)}),
  leetcode({instanceIndex: 0, status: TaskStatus.DONE, doneAt: daysAgo(1)}),
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
  // Backlog: staged habit instances
  leetcode({instanceIndex: 2, status: TaskStatus.BACKLOG}),
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

export const MID_WEEK_PROGRESS = {
  todayDoneCount: 2,
  todayTotalCount: 8,
  todayDonePoints: 2,
  todayTotalPoints: 9,
  weekDoneCount: 4,
  weekProjectedCount: 14,
  weekDonePoints: 4,
  weekProjectedPoints: 16,
  daysElapsed: 5,
};

// ── Mobile backlog scenario inputs ───────────────────────────────────────────
// The inline mobile backlog panel bypasses KanbanBoard, so it receives the
// same habit lookups the live board would compute — built here with the real
// helper (deterministic).
export const BACKLOG_TASKS = MID_WEEK_TASKS.filter(
  task => task.status === TaskStatus.BACKLOG,
);

export const SCENARIO_HABIT_WEEKS = computeHabitWeeks(
  MID_WEEK_TASKS,
  SCENARIO_PLAN,
);
