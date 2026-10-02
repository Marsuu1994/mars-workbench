import {
  getNonDoneAdhocTasks,
  trackAdhocTask,
  completeAdhocTask,
  revertAdhocCompletion,
  type TaskItem,
} from '@/lib/db/tasks';
import {TaskStatus} from '@/generated/prisma/client';
import type {UndoCompleteTaskInput} from '@/schemas';
import {ensureSynced} from '@/services/syncService';

export type MatrixActivePlan = {id: string; periodKey: string};

export type MatrixData = {
  /** All of the user's non-DONE AD_HOC tasks — unassigned and tracked alike. */
  tasks: TaskItem[];
  /** Current-week ACTIVE plan, or null (drives the no-plan state). */
  activePlan: MatrixActivePlan | null;
};

type MatrixTaskResult<E extends string> = {task: TaskItem} | {error: E};
export type TrackTaskResult = MatrixTaskResult<'noActivePlan' | 'taskNotFound'>;
export type CompleteTaskResult = MatrixTaskResult<'taskNotFound'>;

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
 * Track This Week: attach an unassigned matrix task to the current ACTIVE
 * plan, moving it BACKLOG → TODO/DOING onto the board.
 */
export async function trackTaskThisWeek(
  userId: string,
  taskId: string,
  status: TaskStatus,
): Promise<TrackTaskResult> {
  const plan = await ensureSynced(userId);
  if (!plan) return {error: 'noActivePlan'};

  const task = await trackAdhocTask(userId, taskId, plan.id, status);
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

  const task = await completeAdhocTask(userId, taskId, plan?.id ?? null);
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
