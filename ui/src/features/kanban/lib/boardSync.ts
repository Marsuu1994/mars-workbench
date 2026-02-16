import {
  getActivePlan,
  getPlanWithTemplates,
  updateLastSyncDate,
} from "@/lib/db/plans";
import {
  expireStaleDailyTasks,
  createManyTasks,
  getTasksByPlanId,
} from "@/lib/db/tasks";
import type { PlanWithTemplates } from "@/lib/db/plans";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskType, TaskStatus } from "@/generated/prisma/client";
import { getTodayDate, sameDay, getMondayFromPeriodKey } from "../utils/dateUtils";

export type BoardData = {
  plan: PlanWithTemplates;
  tasks: TaskItem[];
  todayDoneCount: number;
  todayTotalCount: number;
  todayDonePoints: number;
  todayTotalPoints: number;
  weekDoneCount: number;
  weekTotalCount: number;
  weekDonePoints: number;
  weekTotalPoints: number;
  daysElapsed: number;
};

/**
 * Run daily sync for a plan: expire stale tasks and generate today's daily tasks.
 * Standalone and reusable (e.g., by a future cron job).
 */
export async function runDailySync(planId: string, today: Date): Promise<void> {
  // Mark sync date first to prevent concurrent re-runs
  await updateLastSyncDate(planId, today);

  // Expire stale daily tasks (forDate < today, not DONE)
  await expireStaleDailyTasks(planId, today);

  // Fetch plan with templates to generate today's daily tasks
  const planWithTemplates = await getPlanWithTemplates(planId);
  if (!planWithTemplates) return;

  const dailyTaskData: Parameters<typeof createManyTasks>[0] = [];

  for (const pt of planWithTemplates.planTemplates) {
    const template = pt.template;
    if (template.type !== TaskType.DAILY) continue;

    for (let i = 0; i < template.frequency; i++) {
      dailyTaskData.push({
        planId,
        templateId: template.id,
        title: template.title,
        description: template.description,
        points: template.points,
        status: TaskStatus.TODO,
        forDate: today,
        instanceIndex: i,
      });
    }
  }

  if (dailyTaskData.length > 0) {
    await createManyTasks(dailyTaskData);
  }
}

/**
 * Fetch the board for the kanban page.
 * Checks if daily sync is needed before running it.
 */
export async function fetchBoard(): Promise<BoardData | null> {
  const activePlan = await getActivePlan();
  if (!activePlan) return null;

  const today = getTodayDate();

  // Only run sync if it hasn't been done today
  const needsSync =
    !activePlan.lastSyncDate ||
    activePlan.lastSyncDate.getTime() !== today.getTime();

  if (needsSync) {
    await runDailySync(activePlan.id, today);
  }

  // Fetch plan with templates for board display
  const planWithTemplates = await getPlanWithTemplates(activePlan.id);
  if (!planWithTemplates) return null;

  // Single query: fetch all tasks for the plan (including expired)
  const allTasks = await getTasksByPlanId(activePlan.id);

  // Filter in-memory: board tasks exclude expired
  const boardTasks = allTasks.filter((t) => t.status !== TaskStatus.EXPIRED);

  // — Today metrics (from board tasks) —
  const todayDone = boardTasks.filter(
    (t) => t.status === TaskStatus.DONE && sameDay(t.doneAt, today)
  );
  const todayDoneCount = todayDone.length;
  const todayTotalCount = boardTasks.length;
  const todayDonePoints = todayDone.reduce((sum, t) => sum + t.points, 0);
  const todayTotalPoints = boardTasks.reduce((sum, t) => sum + t.points, 0);

  // — Week metrics (from all tasks including expired) —
  const weekDone = allTasks.filter((t) => t.status === TaskStatus.DONE);
  const weekDoneCount = weekDone.length;
  const weekTotalCount = allTasks.length;
  const weekDonePoints = weekDone.reduce((sum, t) => sum + t.points, 0);
  const weekTotalPoints = allTasks.reduce((sum, t) => sum + t.points, 0);

  // — Days elapsed (1–7) —
  const weekStart = getMondayFromPeriodKey(planWithTemplates.periodKey);
  const diffMs = today.getTime() - weekStart.getTime();
  const daysElapsed = Math.min(7, Math.max(1, Math.floor(diffMs / 86400000) + 1));

  return {
    plan: planWithTemplates,
    tasks: boardTasks,
    todayDoneCount,
    todayTotalCount,
    todayDonePoints,
    todayTotalPoints,
    weekDoneCount,
    weekTotalCount,
    weekDonePoints,
    weekTotalPoints,
    daysElapsed,
  };
}
