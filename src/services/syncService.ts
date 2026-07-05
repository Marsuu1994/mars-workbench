import {cache} from 'react';
import prisma from '@/lib/prisma';
import {
  getActivePlan,
  getPlanWithTemplates,
  updateLastSyncDate,
  updatePlanStatus,
  type PlanItem,
} from '@/lib/db/plans';
import {
  createManyTasks,
  expireAllNonDoneTasks,
  expireStaleDailyTasks,
} from '@/lib/db/tasks';
import {
  PlanMode,
  PlanStatus,
  TaskType,
  TaskStatus,
} from '@/generated/prisma/client';
import {
  getTodayDate,
  getYesterdayDate,
  isPeriodCurrent,
  isWeekend,
} from '../utils/dateUtils';
import {sizeToPoints} from '../utils/sizeUtils';

/**
 * Run daily sync for a plan: expire stale tasks and generate today's daily tasks.
 * Standalone and reusable (e.g., by a future cron job).
 */
export async function runDailySync(
  userId: string,
  planId: string,
  today: Date,
): Promise<void> {
  // Read before transaction — template data doesn't change during sync
  const planWithTemplates = await getPlanWithTemplates(userId, planId);
  if (!planWithTemplates) return;

  const skipDailyGeneration =
    planWithTemplates.mode === PlanMode.NORMAL && isWeekend(today);

  const dailyTaskData: Parameters<typeof createManyTasks>[0] = [];

  if (!skipDailyGeneration) {
    for (const pt of planWithTemplates.planTemplates) {
      if (pt.type !== TaskType.DAILY) continue;

      for (let i = 0; i < pt.frequency; i++) {
        dailyTaskData.push({
          userId,
          planId,
          templateId: pt.template.id,
          type: TaskType.DAILY,
          title: pt.template.title,
          description: pt.template.description,
          size: pt.template.size,
          points: sizeToPoints(pt.template.size),
          status: TaskStatus.BACKLOG,
          forDate: today,
          instanceIndex: i,
        });
      }
    }
  }

  // 1-day rollover buffer: expire tasks older than yesterday, not older than today.
  // Yesterday's tasks stay active for one more day before expiring.
  const yesterday = getYesterdayDate();

  await prisma.$transaction(async tx => {
    await updateLastSyncDate(userId, planId, today, tx);
    await expireStaleDailyTasks(userId, planId, yesterday, tx);
    if (dailyTaskData.length > 0) {
      await createManyTasks(dailyTaskData, tx);
    }
  });
}

/**
 * Run end-of-period sync: expire all undone tasks and move plan to PENDING_UPDATE.
 * Standalone and reusable (e.g., by a future cron job).
 */
export async function runEndOfPeriodSync(
  userId: string,
  planId: string,
): Promise<void> {
  await prisma.$transaction(async tx => {
    await expireAllNonDoneTasks(userId, planId, tx);
    await updatePlanStatus(userId, planId, PlanStatus.PENDING_UPDATE, tx);
  });
}

/**
 * Single entry point for the sync lifecycle: every kanban page (board, matrix,
 * plan create/edit) awaits this before reading plan state, so no page carries
 * its own sync branching and no "which page did the user visit first?" ordering
 * matters. Flips an ended ACTIVE plan to PENDING_UPDATE, runs the daily sync
 * once per day, and returns the current-week ACTIVE plan (or null).
 *
 * Idempotent, and wrapped in React cache() so concurrent calls within one
 * server render pass (e.g. a page and a nested component) dedupe to one run.
 * Server Actions run in their own request, so mutations re-check fresh state.
 */
export const ensureSynced = cache(
  async (userId: string): Promise<PlanItem | null> => {
    const plan = await getActivePlan(userId);
    if (!plan) return null;

    const today = getTodayDate();

    // Period ended (new ISO week) → complete the period, no active plan anymore
    if (!isPeriodCurrent(plan.periodKey, today)) {
      await runEndOfPeriodSync(userId, plan.id);
      return null;
    }

    // Daily sync at most once per day (lastSyncDate short-circuit)
    const needsSync =
      !plan.lastSyncDate || plan.lastSyncDate.getTime() !== today.getTime();
    if (needsSync) {
      await runDailySync(userId, plan.id, today);
    }

    return plan;
  },
);
