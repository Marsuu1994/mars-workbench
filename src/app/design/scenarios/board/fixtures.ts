import {TaskType, TaskStatus, TaskSize, SIZE_TO_POINTS} from '@/utils/enums';
import type {TaskItem} from '@/lib/db/tasks';
import {
  computeRiskLevel,
  computeTemplateProgress,
  sortTasks,
  type RiskLevel,
} from '@/utils/taskUtils';

/* Board scenario fixtures — real KanbanBoard + ProgressDashboard fed
   fictional weeks that are hard to reach against live data. */

const NOW = new Date('2026-07-10T15:00:00');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/** The scenario's frozen "today" (midnight) and clock hour — risk levels are
    computed against these so the pinned states never drift with the real clock. */
export const SCENARIO_TODAY = new Date('2026-07-10T00:00:00');
const SCENARIO_HOUR = 15;

export const SCENARIO_PERIOD_KEY = '2026-W28';

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
  periodKey: SCENARIO_PERIOD_KEY,
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

// Template-generated instances share everything but their index and day.
const SPRINT: Partial<TaskItem> = {
  title: 'Draft next sprint plan',
  description: 'Carry over the unfinished stories first',
  status: TaskStatus.BACKLOG,
  templateId: 'tpl-sprint',
};
const WORKOUT: Partial<TaskItem> = {
  title: 'Workout',
  description: '45 min — gym or run',
  type: TaskType.WEEKLY,
  status: TaskStatus.BACKLOG,
  templateId: 'tpl-workout',
  ...sized(TaskSize.LARGE),
};

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
  task({...WORKOUT, status: TaskStatus.DONE, doneAt: daysAgo(1)}),
  // Backlog stacks: today's two sprint instances (×2, fresh) apart from
  // yesterday's leftover (a rollover → danger at 15:00), three weekly workouts
  // (×3, two lips; #1 done above keeps them at warning) and a lone weekly
  // (plain card, warning at day 4) — every stack depth and all three borders.
  // Fresh dailies keep forDate null: the desktop tab's KanbanBoard runs on the
  // real clock, where any fixture date would read as a rollover.
  task({...SPRINT, instanceIndex: 0}),
  task({...SPRINT, instanceIndex: 1}),
  task({...SPRINT, instanceIndex: 1, forDate: daysAgo(1)}),
  task({...WORKOUT, instanceIndex: 1}),
  task({...WORKOUT, instanceIndex: 2}),
  task({...WORKOUT, instanceIndex: 3}),
  task({
    title: 'Read the incident post-mortem',
    type: TaskType.WEEKLY,
    status: TaskStatus.BACKLOG,
    templateId: 'tpl-postmortem',
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

export const SCENARIO_PLAN_TEMPLATES: Array<{
  templateId: string;
  frequency: number;
}> = [
  {templateId: 'tpl-sprint', frequency: 2},
  {templateId: 'tpl-workout', frequency: 4},
  {templateId: 'tpl-postmortem', frequency: 1},
];

// ── Mobile backlog scenario inputs ───────────────────────────────────────────
// The inline mobile backlog panel bypasses KanbanBoard, so it receives the
// same sorted list and risk lookup the live board would compute — built here
// with the real helpers against the frozen scenario clock (deterministic).
export const BACKLOG_TASKS = sortTasks(
  MID_WEEK_TASKS.filter(task => task.status === TaskStatus.BACKLOG),
  SCENARIO_TODAY,
);

const SCENARIO_TEMPLATE_FREQ_MAP = new Map(
  SCENARIO_PLAN_TEMPLATES.map(pt => [pt.templateId, pt.frequency]),
);

const templateProgressMap = computeTemplateProgress(MID_WEEK_TASKS);

export const BACKLOG_RISK_MAP = new Map<string, RiskLevel>(
  BACKLOG_TASKS.map(task => [
    task.id,
    computeRiskLevel(
      task,
      SCENARIO_TODAY,
      SCENARIO_HOUR,
      MID_WEEK_PROGRESS.daysElapsed,
      SCENARIO_TEMPLATE_FREQ_MAP,
      templateProgressMap,
    ),
  ]),
);
