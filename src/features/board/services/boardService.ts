import {
  getPlanByStatus,
  getPlanWithTemplates,
} from "@/lib/db/plans";
import {
  getBoardMetricsByPlanId,
  getBoardTasksByPlanId,
  getPlanTemplateStats,
} from "@/lib/db/tasks";
import type { PlanWithTemplates } from "@/lib/db/plans";
import type { TaskItem } from "@/lib/db/tasks";
import type { OverallStats } from "@/lib/kanban/types";
import { rollUpOverall } from "@/lib/kanban/statsUtils";
import { PlanMode, TaskType, TaskStatus, PlanStatus } from "@/generated/prisma/client";
import { getTodayDate, getMondayFromPeriodKey, getSundayFromPeriodKey, countWeekdaysInRange } from "@/lib/kanban/dateUtils";
import { sizeToPoints } from "@/lib/kanban/sizeUtils";
import { ensureSynced } from "@/lib/kanban/syncService";

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
 * The empty-board state when there is no ACTIVE plan: a brand-new user vs. a
 * returning user whose previous plan's period has ended (PENDING_UPDATE),
 * whose finished-plan stats drive the celebratory recap.
 */
export type EmptyBoardState =
  | { kind: "new" }
  | { kind: "returning"; stats: OverallStats };

/**
 * Resolve the empty-board state for a user with no ACTIVE plan. Must be called
 * after `fetchBoard` so any end-of-period sync (ACTIVE → PENDING_UPDATE) has run.
 */
export async function getEmptyBoardState(userId: string): Promise<EmptyBoardState> {
  const pendingPlan = await getPlanByStatus(userId, PlanStatus.PENDING_UPDATE);
  if (!pendingPlan) return { kind: "new" };

  const rows = await getPlanTemplateStats(userId, pendingPlan.id);
  return { kind: "returning", stats: rollUpOverall(rows) };
}

/**
 * Fetch the board for the kanban page.
 * Checks if period has ended or daily sync is needed before running.
 */
export async function fetchBoard(userId: string): Promise<BoardData | null> {
  // End-of-period + daily sync live in syncService (shared with the matrix
  // and plan pages); returns the current-week ACTIVE plan or null.
  const activePlan = await ensureSynced(userId);
  if (!activePlan) return null;

  const today = getTodayDate();

  // Fetch plan with templates for board display
  const planWithTemplates = await getPlanWithTemplates(userId, activePlan.id);
  if (!planWithTemplates) return null;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [boardTasks, boardMetrics] = await Promise.all([
    getBoardTasksByPlanId(userId, activePlan.id),
    getBoardMetricsByPlanId(userId, activePlan.id, today, tomorrow),
  ]);

  // — Today metrics —
  // Backlog tasks are staged off-board (drawer), so they are excluded from the
  // Today ring/points. Week projection (from the DB aggregate) still counts them.
  const onBoardTasks = boardTasks.filter(
    (t) => t.status !== TaskStatus.BACKLOG
  );
  const todayDoneCount = boardMetrics.todayDoneCount;
  const todayTotalCount = onBoardTasks.length;
  const todayDonePoints = boardMetrics.todayDonePoints;
  const todayTotalPoints = onBoardTasks.reduce((sum, t) => sum + t.points, 0);

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
      (s, pt) => s + sizeToPoints(pt.template.size) * pt.frequency,
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
