import type {MatrixTaskRow, TaskItem} from '@/lib/db/tasks';
import type {CreateAdhocTaskInput} from '../schemas';
import type {OneOffTaskSummary} from '../types/plan';
import type {MatrixData} from '../services/matrixService';
import {PriorityQuadrant, TaskStatus} from './enums';
import {formatKanbanISODate, getISOWeekKey} from './dateUtils';
import {sizeToPoints} from './sizeUtils';
import {getWeekPlacement} from './taskUtils';

/** The most one-off tasks one Claude call creates, completes or moves. */
export const ONE_OFF_BATCH_LIMIT = 20;

/** Matrix order: Do First / Schedule (top row), Squeeze In / Maybe Later (bottom). */
export const QUADRANT_ORDER: PriorityQuadrant[] = [
  PriorityQuadrant.DO_FIRST,
  PriorityQuadrant.SCHEDULE,
  PriorityQuadrant.SQUEEZE_IN,
  PriorityQuadrant.MAYBE_LATER,
];

/**
 * Tasks created before the matrix (or during a deploy window) may carry a null
 * quadrant — group them into the backfill default so no card silently drops
 * out of the 2×2 grid.
 */
export const FALLBACK_QUADRANT = PriorityQuadrant.SCHEDULE;

/** Where a one-off sits on the weeks. */
export const OneOffTaskState = {
  DONE: 'DONE',
  THIS_WEEK: 'THIS_WEEK',
  /** Left on the previous week's plan (PENDING_UPDATE) until the next plan
      carries it over or returns it to the matrix */
  LAST_WEEK: 'LAST_WEEK',
  /** On no week: on the matrix, not tracked yet */
  UNTRACKED: 'UNTRACKED',
} as const;
export type OneOffTaskState =
  (typeof OneOffTaskState)[keyof typeof OneOffTaskState];

export function getOneOffTaskState(
  task: Pick<TaskItem, 'status' | 'planId'>,
  activePlanId: string | null,
): OneOffTaskState {
  if (task.status === TaskStatus.DONE) return OneOffTaskState.DONE;
  return getWeekPlacement(task, activePlanId) ?? OneOffTaskState.UNTRACKED;
}

/** A one-off as the planning tools list it. */
export function toOneOffTaskSummary(
  task: TaskItem,
  activePlanId: string | null,
): OneOffTaskSummary {
  const {id, title, description, size, points, quadrant, createdAt} = task;
  return {
    taskId: id,
    title,
    description,
    size,
    points,
    quadrant,
    state: getOneOffTaskState(task, activePlanId),
    createdOn: formatKanbanISODate(createdAt),
  };
}

/** One-offs in matrix order: by quadrant, each keeping the order given. */
export const sortByQuadrant = <Task extends Pick<TaskItem, 'quadrant'>>(
  tasks: readonly Task[],
): Task[] => {
  const quadrantRank = ({quadrant}: Task) =>
    quadrant === null
      ? QUADRANT_ORDER.length
      : QUADRANT_ORDER.indexOf(quadrant);
  return [...tasks].sort((a, b) => quadrantRank(a) - quadrantRank(b));
};

/** A new matrix task's row, with points derived from its size. */
export const toMatrixTaskRow = ({
  title,
  description,
  size,
  quadrant,
}: CreateAdhocTaskInput): MatrixTaskRow => ({
  title,
  description: description || undefined,
  size,
  points: sizeToPoints(size),
  quadrant,
});

/** On the active plan's week: the matrix dims it under a This Week tag. */
export const isTrackedTask = (
  task: Pick<TaskItem, 'planId'>,
  activePlanId: string | null,
): boolean => activePlanId !== null && task.planId === activePlanId;

/** The matrix's four cells, each keeping the order given; a null quadrant
    lands in FALLBACK_QUADRANT. */
export const groupTasksByQuadrant = <Task extends Pick<TaskItem, 'quadrant'>>(
  tasks: readonly Task[],
): Record<PriorityQuadrant, Task[]> => {
  const tasksByQuadrant: Record<PriorityQuadrant, Task[]> = {
    [PriorityQuadrant.DO_FIRST]: [],
    [PriorityQuadrant.SCHEDULE]: [],
    [PriorityQuadrant.SQUEEZE_IN]: [],
    [PriorityQuadrant.MAYBE_LATER]: [],
  };
  for (const task of tasks) {
    tasksByQuadrant[task.quadrant ?? FALLBACK_QUADRANT].push(task);
  }
  return tasksByQuadrant;
};

/** The priorities page's props: the matrix and the week its header shows. */
export interface PrioritiesPageProps extends MatrixData {
  periodKey: string;
}

/**
 * The priorities page's adapter: the matrix read → `PrioritiesPage`'s props.
 * With no active plan the header falls back to `today`'s ISO week.
 */
export const toPrioritiesPageProps = (
  matrix: MatrixData,
  today: Date,
): PrioritiesPageProps => ({
  ...matrix,
  periodKey: matrix.activePlan?.periodKey ?? getISOWeekKey(today),
});
