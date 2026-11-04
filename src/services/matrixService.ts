import {
  getNonDoneAdhocTasks,
  trackAdhocTasks,
  completeAdhocTasks,
  createMatrixTasks,
  revertAdhocCompletion,
  updateAdhocTaskQuadrants,
  type TaskItem,
} from '@/lib/db/tasks';
import {TaskStatus, type PriorityQuadrant} from '@/generated/prisma/client';
import type {CreateAdhocTaskInput, UndoCompleteTaskInput} from '@/schemas';
import {toMatrixTaskRow} from '@/utils/oneOffUtils';
import {ensureSynced} from '@/services/syncService';
import type {MatrixData} from '@/types/priorities';

type MatrixTaskResult<E extends string> = {task: TaskItem} | {error: E};
export type TrackTaskResult = MatrixTaskResult<'noActivePlan' | 'taskNotFound'>;
export type CompleteTaskResult = MatrixTaskResult<'taskNotFound'>;
type ReprioritizeTaskResult = MatrixTaskResult<'taskNotFound'>;

export async function fetchPriorityMatrix(userId: string): Promise<MatrixData> {
  // ensureSynced flips an ended ACTIVE plan to PENDING_UPDATE (same lifecycle
  // as the board), so the matrix can neither display nor track into a stale
  // plan and the no-plan "Create Plan" CTA works.
  const [tasks, plan] = await Promise.all([
    getNonDoneAdhocTasks(userId),
    ensureSynced(userId),
  ]);

  return {
    tasks,
    activePlan: plan ? {id: plan.id, periodKey: plan.periodKey} : null,
  };
}

/**
 * Add Priority Task: a one-off on the matrix in the given quadrant, on no
 * week (`planId = null`, `BACKLOG`). It reaches the board only through Track
 * This Week.
 */
export async function addMatrixTask(
  userId: string,
  input: CreateAdhocTaskInput,
): Promise<TaskItem> {
  const [task] = await createMatrixTasks(userId, [toMatrixTaskRow(input)]);
  return task;
}

/**
 * Reprioritize: move an unfinished one-off to another quadrant; its status
 * and week stay as they are.
 */
export async function reprioritizeMatrixTask(
  userId: string,
  taskId: string,
  quadrant: PriorityQuadrant,
): Promise<ReprioritizeTaskResult> {
  const [task] = await updateAdhocTaskQuadrants(userId, [taskId], quadrant);
  if (!task) return {error: 'taskNotFound'};

  return {task};
}

/**
 * Track This Week: attach an unassigned matrix task to the current ACTIVE
 * plan, moving it BACKLOG → TODO onto the board. MCP's addOneOffTaskIds
 * tracks through the same write.
 */
export async function trackTaskThisWeek(
  userId: string,
  taskId: string,
  status: TaskStatus,
): Promise<TrackTaskResult> {
  const plan = await ensureSynced(userId);
  if (!plan) return {error: 'noActivePlan'};

  const [task] = await trackAdhocTasks(userId, [taskId], plan.id, status);
  if (!task) return {error: 'taskNotFound'};

  return {task};
}

/**
 * Complete One-off: mark a matrix task DONE in place. An unassigned task is
 * credited to the current ACTIVE plan when there is one (same outcome as
 * track → drag to Done); without a plan it is simply closed, planId null.
 */
export async function completeMatrixTask(
  userId: string,
  taskId: string,
): Promise<CompleteTaskResult> {
  const plan = await ensureSynced(userId);

  const [task] = await completeAdhocTasks(userId, [taskId], plan?.id ?? null);
  if (!task) return {error: 'taskNotFound'};

  return {task};
}

/**
 * Undo a matrix completion within the toast window: restore the validated
 * pre-complete snapshot (status, and the plan link the complete added).
 */
export async function undoCompleteMatrixTask(
  userId: string,
  taskId: string,
  input: UndoCompleteTaskInput,
): Promise<CompleteTaskResult> {
  const task = await revertAdhocCompletion(userId, taskId, input);
  if (!task) return {error: 'taskNotFound'};

  return {task};
}
