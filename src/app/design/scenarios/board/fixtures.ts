import {TaskType, TaskStatus, TaskSize, SIZE_TO_POINTS} from '@/utils/enums';
import type {TaskItem} from '@/lib/db/tasks';

/* Board scenario fixtures — real KanbanBoard + ProgressDashboard fed
   fictional weeks that are hard to reach against live data. */

const NOW = new Date('2026-07-10T15:00:00');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

let seq = 0;
const task = (overrides: Partial<TaskItem>): TaskItem => ({
  id: `scn-${seq++}`,
  planId: 'scn-plan',
  templateId: null,
  type: TaskType.DAILY,
  title: 'Task',
  description: null,
  size: TaskSize.MEDIUM,
  points: SIZE_TO_POINTS[TaskSize.MEDIUM],
  status: TaskStatus.TODO,
  forDate: null,
  periodKey: '2026-W28',
  quadrant: null,
  instanceIndex: 0,
  createdAt: daysAgo(4),
  updatedAt: NOW,
  doneAt: null,
  ...overrides,
});

const sized = (size: TaskSize): Pick<TaskItem, 'size' | 'points'> => ({
  size,
  points: SIZE_TO_POINTS[size],
});

// ── Mid-week, on track ───────────────────────────────────────────────────────
export const MID_WEEK_TASKS: TaskItem[] = [
  task({title: 'Review pull requests', status: TaskStatus.TODO}),
  task({
    title: 'Write the weekly summary',
    type: TaskType.WEEKLY,
    status: TaskStatus.TODO,
    ...sized(TaskSize.LARGE),
  }),
  task({title: 'Reply to design feedback', status: TaskStatus.DOING}),
  task({
    title: 'Pair on the sync refactor',
    status: TaskStatus.DOING,
    ...sized(TaskSize.LARGE),
  }),
  task({
    title: 'Morning workout',
    status: TaskStatus.DONE,
    doneAt: daysAgo(0),
    ...sized(TaskSize.SMALL),
  }),
  task({
    title: 'Inbox zero',
    status: TaskStatus.DONE,
    doneAt: daysAgo(0),
    ...sized(TaskSize.EXTRA_SMALL),
  }),
  task({
    title: 'Stand-up notes',
    status: TaskStatus.DONE,
    doneAt: daysAgo(1),
    ...sized(TaskSize.SMALL),
  }),
  task({title: 'Draft next sprint plan', status: TaskStatus.BACKLOG}),
  task({
    title: 'Read the incident post-mortem',
    status: TaskStatus.BACKLOG,
    ...sized(TaskSize.SMALL),
  }),
];

export const MID_WEEK_PROGRESS = {
  todayDoneCount: 2,
  todayTotalCount: 4,
  todayDonePoints: 3,
  todayTotalPoints: 11,
  weekDoneCount: 3,
  weekProjectedCount: 9,
  weekDonePoints: 7,
  weekProjectedPoints: 34,
  daysElapsed: 4,
};

// ── Friday, several at risk ──────────────────────────────────────────────────
export const DANGER_TASKS: TaskItem[] = [
  task({
    title: 'Ship the release build',
    type: TaskType.WEEKLY,
    status: TaskStatus.TODO,
    ...sized(TaskSize.EXTRA_LARGE),
  }),
  task({
    title: 'Close the launch checklist',
    type: TaskType.WEEKLY,
    status: TaskStatus.TODO,
    ...sized(TaskSize.LARGE),
  }),
  task({
    title: 'Overdue: rotate the API keys',
    status: TaskStatus.TODO,
    forDate: daysAgo(2),
    ...sized(TaskSize.MEDIUM),
  }),
  task({
    title: 'File the compliance report',
    type: TaskType.WEEKLY,
    status: TaskStatus.DOING,
    ...sized(TaskSize.LARGE),
  }),
  task({
    title: 'Sign off the design review',
    status: TaskStatus.DONE,
    doneAt: daysAgo(0),
    ...sized(TaskSize.SMALL),
  }),
  task({
    title: 'Backlog: refresh onboarding docs',
    status: TaskStatus.BACKLOG,
    ...sized(TaskSize.MEDIUM),
  }),
];

export const DANGER_PROGRESS = {
  todayDoneCount: 1,
  todayTotalCount: 5,
  todayDonePoints: 2,
  todayTotalPoints: 24,
  weekDoneCount: 6,
  weekProjectedCount: 14,
  weekDonePoints: 18,
  weekProjectedPoints: 47,
  daysElapsed: 6,
};

export const SCENARIO_PLAN_TEMPLATES: Array<{
  templateId: string;
  frequency: number;
}> = [];
