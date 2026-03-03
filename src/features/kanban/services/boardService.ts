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
  getBoardMetricsByPlanId,
  getBoardTasksByPlanId,
} from "@/lib/db/tasks";
import type { PlanWithTemplates } from "@/lib/db/plans";
import type { TaskItem } from "@/lib/db/tasks";
import { PlanMode, TaskType, TaskStatus, PlanStatus } from "@/generated/prisma/client";
import { getTodayDate, getYesterdayDate, getISOWeekKey, getMondayFromPeriodKey, getSundayFromPeriodKey, isWeekend, countWeekdaysInRange } from "../utils/dateUtils";

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

  const skipDailyGeneration =
    planWithTemplates.mode === PlanMode.NORMAL && isWeekend(today);

  const dailyTaskData: Parameters<typeof createManyTasks>[0] = [];

  if (!skipDailyGeneration) {
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

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [boardTasks, boardMetrics] = await Promise.all([
    getBoardTasksByPlanId(activePlan.id),
    getBoardMetricsByPlanId(activePlan.id, today, tomorrow),
  ]);

  // — Today metrics —
  const todayDoneCount = boardMetrics.todayDoneCount;
  const todayTotalCount = boardTasks.length;
  const todayDonePoints = boardMetrics.todayDonePoints;
  const todayTotalPoints = boardTasks.reduce((sum, t) => sum + t.points, 0);

  // — Week Projected (Option C: past instances + future projection + weekly instances) —
  const dailyPastPoints = boardMetrics.dailyPastPoints;
  const dailyPastCount = boardMetrics.dailyPastCount;

  const weekEnd = getSundayFromPeriodKey(planWithTemplates.periodKey);
  const remainingDays =
    planWithTemplates.mode === PlanMode.NORMAL
      ? countWeekdaysInRange(today, weekEnd)
      : Math.max(1, Math.floor((weekEnd.getTime() - today.getTime()) / 86400000) + 1);

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

  const weeklyPoints = boardMetrics.weeklyPoints;
  const weeklyCount = boardMetrics.weeklyCount;

  // Ad-hoc tasks: always included in projected (never expire, no future generation)
  const adhocPoints = boardMetrics.adhocPoints;
  const adhocCount = boardMetrics.adhocCount;

  const weekProjectedPoints = dailyPastPoints + dailyFuturePoints + weeklyPoints + adhocPoints;
  const weekProjectedCount = dailyPastCount + dailyFutureCount + weeklyCount + adhocCount;

  const weekDoneCount = boardMetrics.weekDoneCount;
  const weekDonePoints = boardMetrics.weekDonePoints;

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
