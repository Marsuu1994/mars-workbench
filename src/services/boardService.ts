import {getPlanByStatus} from '@/lib/db/plans';
import {getBoardPlanTemplatesByPlanId} from '@/lib/db/planTemplates';
import {getProjectPathsByPlanId} from '@/lib/db/projects';
import {
  getBoardTasksByPlanId,
  getExpiredDailyCountsByPlanId,
  getPlanTaskTotals,
  updateTaskStatus,
  type BoardMoveStatus,
  type TaskItem,
} from '@/lib/db/tasks';
import type {BoardData, BoardRecap} from '@/types/board';
import {PlanStatus} from '@/generated/prisma/client';
import {ensureSynced} from '@/services/syncService';

/**
 * The empty-board state when there is no ACTIVE plan: a brand-new user vs. a
 * returning user whose previous plan's period has ended (PENDING_UPDATE),
 * recapped over all of that plan's tasks.
 */
export type EmptyBoardState =
  {kind: 'new'} | {kind: 'returning'; recap: BoardRecap};

/**
 * Resolve the empty-board state for a user with no ACTIVE plan. Must be called
 * after `fetchBoard` so any end-of-period sync (ACTIVE → PENDING_UPDATE) has run.
 */
export async function getEmptyBoardState(
  userId: string,
): Promise<EmptyBoardState> {
  const pendingPlan = await getPlanByStatus(userId, PlanStatus.PENDING_UPDATE);
  if (!pendingPlan) return {kind: 'new'};

  const totals = await getPlanTaskTotals(userId, pendingPlan.id);
  const completionRate =
    totals.totalCount > 0 ? totals.doneCount / totals.totalCount : 0;
  return {kind: 'returning', recap: {...totals, completionRate}};
}

/**
 * Fetch the board for the kanban page, shaped for its screen: the plan
 * narrowed to what the board reads, the tasks (the client's state), the
 * projects behind the step cards, and each past day's expired daily habit
 * tasks, which the day rings count as planned. Checks if period has ended or
 * daily sync is needed before running.
 */
export async function fetchBoard(userId: string): Promise<BoardData | null> {
  // End-of-period + daily sync live in syncService (shared with the matrix
  // and plan pages); returns the current-week ACTIVE plan or null.
  const activePlan = await ensureSynced(userId);
  if (!activePlan) return null;

  // Everything else hangs off the plan id, so it reads in parallel: the
  // board loads in two database round trips (the sync's plan read, then these)
  const [planTemplates, boardTasks, expiredDailyCountByDate, projects] =
    await Promise.all([
      getBoardPlanTemplatesByPlanId(userId, activePlan.id),
      getBoardTasksByPlanId(userId, activePlan.id),
      getExpiredDailyCountsByPlanId(userId, activePlan.id),
      // The projects behind the board's step cards: each card draws its path
      getProjectPathsByPlanId(userId, activePlan.id),
    ]);
  const {periodKey, mode} = activePlan;

  return {
    plan: {
      periodKey,
      mode,
      planTemplates: planTemplates.map(({templateId, type, frequency}) => ({
        templateId,
        type,
        frequency,
      })),
    },
    tasks: boardTasks,
    projects,
    expiredDailyCountByDate,
  };
}

/**
 * Move a board card forward (↑ Todo or ✓ Complete): the moves the board
 * allows are the DAL's `WHERE` (`updateTaskStatus`), so a refused move is
 * not found.
 */
export async function moveBoardTask(
  userId: string,
  taskId: string,
  status: BoardMoveStatus,
): Promise<{task: TaskItem} | {error: 'taskNotFound'}> {
  const task = await updateTaskStatus(userId, taskId, status);
  if (!task) return {error: 'taskNotFound'};

  return {task};
}
