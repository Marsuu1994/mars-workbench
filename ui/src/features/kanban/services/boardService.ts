import prisma from "@/lib/prisma";
import {
  getActivePlan,
  getPlanWithTemplates,
  updateLastSyncDate,
  updatePlanStatus,
} from "@/lib/db/plans";
import {
  expireStaleDailyTasks,
  expireAllNonDoneTasks,
  createManyTasks,
  getTasksByPlanId,
} from "@/lib/db/tasks";
import type { PlanWithTemplates } from "@/lib/db/plans";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskType, TaskStatus, PlanStatus } from "@/generated/prisma/client";
import { getTodayDate, getYesterdayDate, getISOWeekKey, sameDay, getMondayFromPeriodKey, getSundayFromPeriodKey } from "../utils/dateUtils";

export type BoardData = {
  plan: PlanWithTemplates;
  tasks: TaskItem[];
  todayDoneCount: number;
  todayTotalCount: number;
  todayDonePoints: number;
  todayTotalPoints: number;
  weekDoneCount: number;
  weekProjectedCount: number;
  weekDonePoints: number;
  weekProjectedPoints: number;
  daysElapsed: number;
};

/**
 * Run daily sync for a plan: expire stale tasks and generate today's daily tasks.
 * Standalone and reusable (e.g., by a future cron job).
 */
export async function runDailySync(planId: string, today: Date): Promise<void> {
  // Read before transaction — template data doesn't change during sync
  const planWithTemplates = await getPlanWithTemplates(planId);
  if (!planWithTemplates) return;

  const dailyTaskData: Parameters<typeof createManyTasks>[0] = [];

  for (const pt of planWithTemplates.planTemplates) {
    if (pt.type !== TaskType.DAILY) continue;

    for (let i = 0; i < pt.frequency; i++) {
      dailyTaskData.push({
        planId,
        templateId: pt.template.id,
        type: TaskType.DAILY,
        title: pt.template.title,
        description: pt.template.description,
        points: pt.template.points,
        status: TaskStatus.TODO,
        forDate: today,
        instanceIndex: i,
      });
    }
  }

  // 1-day rollover buffer: expire tasks older than yesterday, not older than today.
  // Yesterday's tasks stay active for one more day before expiring.
  const yesterday = getYesterdayDate();

  await prisma.$transaction(async (tx) => {
    await updateLastSyncDate(planId, today, tx);
    await expireStaleDailyTasks(planId, yesterday, tx);
    if (dailyTaskData.length > 0) {
      await createManyTasks(dailyTaskData, tx);
    }
  });
}

/**
 * Run end-of-period sync: expire all undone tasks and move plan to PENDING_UPDATE.
 * Standalone and reusable (e.g., by a future cron job).
 */
export async function runEndOfPeriodSync(planId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await expireAllNonDoneTasks(planId, tx);
    await updatePlanStatus(planId, PlanStatus.PENDING_UPDATE, tx);
  });
}

/**
 * Fetch the board for the kanban page.
 * Checks if period has ended or daily sync is needed before running.
 */
export async function fetchBoard(): Promise<BoardData | null> {
  const activePlan = await getActivePlan();
  if (!activePlan) return null;

  const today = getTodayDate();

  // Check if the plan's period has ended (new week started)
  if (getISOWeekKey(today) !== activePlan.periodKey) {
    await runEndOfPeriodSync(activePlan.id);
    return null;
  }

  // Only run daily sync if it hasn't been done today
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

  console.log(allTasks)

  // — Today metrics (from board tasks) —
  const todayDone = boardTasks.filter(
    (t) => t.status === TaskStatus.DONE && sameDay(t.doneAt, today)
  );
  const todayDoneCount = todayDone.length;
  const todayTotalCount = boardTasks.length;
  const todayDonePoints = todayDone.reduce((sum, t) => sum + t.points, 0);
  const todayTotalPoints = boardTasks.reduce((sum, t) => sum + t.points, 0);

  // — Week Projected (Option C: past instances + future projection + weekly instances) —
  const dailyPastTasks = allTasks.filter(
    (t) => t.forDate && t.forDate < today
  );
  const dailyPastPoints = dailyPastTasks.reduce((s, t) => s + t.points, 0);
  const dailyPastCount = dailyPastTasks.length;

  const weekEnd = getSundayFromPeriodKey(planWithTemplates.periodKey);
  const remainingMs = weekEnd.getTime() - today.getTime();
  const remainingDays = Math.max(1, Math.floor(remainingMs / 86400000) + 1);

  const currentDailyTemplates = planWithTemplates.planTemplates.filter(
    (pt) => pt.type === TaskType.DAILY
  );
  const dailyFuturePoints =
    currentDailyTemplates.reduce(
      (s, pt) => s + pt.template.points * pt.frequency,
      0
    ) * remainingDays;
  const dailyFutureCount =
    currentDailyTemplates.reduce((s, pt) => s + pt.frequency, 0) *
    remainingDays;

  const weeklyTasks = allTasks.filter((t) => t.type === TaskType.WEEKLY);
  const weeklyPoints = weeklyTasks.reduce((s, t) => s + t.points, 0);
  const weeklyCount = weeklyTasks.length;

  const weekProjectedPoints = dailyPastPoints + dailyFuturePoints + weeklyPoints;
  const weekProjectedCount = dailyPastCount + dailyFutureCount + weeklyCount;

  const weekDone = allTasks.filter((t) => t.status === TaskStatus.DONE);
  const weekDoneCount = weekDone.length;
  const weekDonePoints = weekDone.reduce((s, t) => s + t.points, 0);

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
    weekProjectedCount,
    weekDonePoints,
    weekProjectedPoints,
    daysElapsed,
  };
}
