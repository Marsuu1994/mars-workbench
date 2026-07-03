import {
  getNonDoneAdhocTasks,
  trackAdhocTask,
  type TaskItem,
} from "@/lib/db/tasks";
import { TaskStatus } from "@/generated/prisma/client";
import { ensureSynced } from "@/lib/kanban/syncService";

export type MatrixActivePlan = { id: string; periodKey: string };

export type MatrixData = {
  /** All of the user's non-DONE AD_HOC tasks — unassigned and tracked alike. */
  tasks: TaskItem[];
  /** Current-week ACTIVE plan, or null (drives the no-plan state). */
  activePlan: MatrixActivePlan | null;
};

export type TrackTaskResult =
  | { task: TaskItem }
  | { error: "noActivePlan" | "taskNotFound" };

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
    activePlan: plan ? { id: plan.id, periodKey: plan.periodKey } : null,
  };
}

/**
 * Track This Week: attach an unassigned matrix task to the current ACTIVE
 * plan, moving it BACKLOG → TODO/DOING onto the board.
 */
export async function trackTaskThisWeek(
  userId: string,
  taskId: string,
  status: TaskStatus
): Promise<TrackTaskResult> {
  const plan = await ensureSynced(userId);
  if (!plan) return { error: "noActivePlan" };

  const task = await trackAdhocTask(userId, taskId, plan.id, status);
  if (!task) return { error: "taskNotFound" };

  return { task };
}
