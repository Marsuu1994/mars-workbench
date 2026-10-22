import type {MatrixTaskRow, TaskItem} from '@/lib/db/tasks';
import type {CreateAdhocTaskInput} from '../schemas';
import type {OneOffTaskSummary} from '../types/plan';
import {PriorityQuadrant, TaskStatus} from './enums';
import {formatKanbanISODate} from './dateUtils';
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
