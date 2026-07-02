import {
  getNonDoneAdhocTasks,
  trackAdhocTask,
  type TaskItem,
} from "@/lib/db/tasks";
import { getActivePlan, type PlanItem } from "@/lib/db/plans";
import { TaskStatus } from "@/generated/prisma/client";
import { isPeriodCurrent, getTodayDate } from "../utils/dateUtils";
import { runEndOfPeriodSync } from "./boardService";

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

/**
 * ACTIVE plan whose period has already ended counts as no plan here, and —
 * exactly like the board's fetchBoard — triggers the End of Period Sync
 * (ACTIVE → PENDING_UPDATE). Without the sync, the matrix's "Create Plan"
 * CTA would dead-end: a user landing on /kanban/priorities first after the
 * ISO week rolls over would reach /kanban/plans/new while the stale plan is
 * still ACTIVE, and plan creation would reject with "an active plan exists".
 */
async function getCurrentWeekActivePlan(userId: string): Promise<PlanItem | null> {
  const plan = await getActivePlan(userId);
  if (!plan) return null;
  if (!isPeriodCurrent(plan.periodKey, getTodayDate())) {
    await runEndOfPeriodSync(userId, plan.id);
    return null;
  }
  return plan;
}

export async function fetchPriorityMatrix(userId: string): Promise<MatrixData> {
  const [tasks, plan] = await Promise.all([
    getNonDoneAdhocTasks(userId),
    getCurrentWeekActivePlan(userId),
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
  const plan = await getCurrentWeekActivePlan(userId);
  if (!plan) return { error: "noActivePlan" };

  const task = await trackAdhocTask(userId, taskId, plan.id, status);
  if (!task) return { error: "taskNotFound" };

  return { task };
}
