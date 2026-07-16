import {
  TaskType,
  TaskStatus,
  TaskSize,
  PriorityQuadrant,
  SIZE_TO_POINTS,
} from '@/utils/enums';
import type {TaskItem} from '@/lib/db/tasks';
import type {MatrixActivePlan} from '@/services/matrixService';

/* Priorities scenario fixtures — the real matrix page fed a populated
   Eisenhower spread with a couple of tracked (on-board) tasks. */

const NOW = new Date('2026-07-10T15:00:00');

export const SCENARIO_ACTIVE_PLAN: MatrixActivePlan = {
  id: 'scn-plan',
  periodKey: '2026-W28',
};

let seq = 0;
const task = (overrides: Partial<TaskItem>): TaskItem => ({
  id: `scn-p${seq++}`,
  planId: null,
  templateId: null,
  type: TaskType.AD_HOC,
  title: 'Task',
  description: null,
  size: TaskSize.SMALL,
  points: SIZE_TO_POINTS[TaskSize.SMALL],
  status: TaskStatus.BACKLOG,
  forDate: null,
  periodKey: null,
  quadrant: PriorityQuadrant.SCHEDULE,
  instanceIndex: 0,
  createdAt: NOW,
  updatedAt: NOW,
  doneAt: null,
  ...overrides,
});

const sized = (size: TaskSize): Pick<TaskItem, 'size' | 'points'> => ({
  size,
  points: SIZE_TO_POINTS[size],
});

/** The card whose track popover is pinned open in the Track tab — a card
    with free space below it, so the quadrant's scroll clipping (a known
    open issue for bottom cards) doesn't cut the popover off. */
export const POPOVER_TASK_ID = 'scn-track-popover';

/** The card shown in the mobile track sheet (has description + points meta). */
const SHEET_TASK_ID = 'scn-track-sheet';

export const MATRIX_TASKS: TaskItem[] = [
  // Do First — one tracked (dimmed, This Week tag), one actionable
  task({
    title: 'Shop birthday gift',
    description: 'For mom — this Saturday',
    quadrant: PriorityQuadrant.DO_FIRST,
    planId: SCENARIO_ACTIVE_PLAN.id,
    status: TaskStatus.TODO,
  }),
  task({
    id: SHEET_TASK_ID,
    title: 'Call dentist',
    description: 'Annual checkup is overdue',
    quadrant: PriorityQuadrant.DO_FIRST,
  }),
  // Schedule
  task({
    title: 'File tax report',
    description: 'Deadline end of month',
    quadrant: PriorityQuadrant.SCHEDULE,
    planId: SCENARIO_ACTIVE_PLAN.id,
    status: TaskStatus.DOING,
    ...sized(TaskSize.MEDIUM),
  }),
  task({
    title: 'Find gym coach',
    description: 'Ask for trial sessions',
    quadrant: PriorityQuadrant.SCHEDULE,
    ...sized(TaskSize.MEDIUM),
  }),
  task({
    title: 'Learn Python basics',
    description: 'Finish the intro course',
    quadrant: PriorityQuadrant.SCHEDULE,
    ...sized(TaskSize.LARGE),
  }),
  // Squeeze In
  task({
    id: POPOVER_TASK_ID,
    title: 'Reply to landlord',
    description: 'About the heating fix',
    quadrant: PriorityQuadrant.SQUEEZE_IN,
    ...sized(TaskSize.EXTRA_SMALL),
  }),
  // Maybe Later
  task({
    title: 'Explore new recipe',
    quadrant: PriorityQuadrant.MAYBE_LATER,
  }),
  task({
    title: 'Try pottery class',
    quadrant: PriorityQuadrant.MAYBE_LATER,
    ...sized(TaskSize.MEDIUM),
  }),
];

/** The task shown in the mobile track sheet. */
export const SHEET_TASK: TaskItem = MATRIX_TASKS.find(
  t => t.id === SHEET_TASK_ID,
)!;
