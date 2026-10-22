import {prisma} from '@/lib/prisma';
import {
  completeAdhocTasks,
  createMatrixTasks,
  getNonDoneAdhocTasks,
  updateAdhocTaskQuadrants,
  type TaskItem,
} from '@/lib/db/tasks';
import {
  QUADRANT_ORDER,
  toMatrixTaskRow,
  toOneOffTaskSummary,
} from '@/utils/oneOffUtils';
import {findRepeatedIds} from '@/utils/planUtils';
import {PLANNING_ERROR} from '@/utils/errorMessages';
import type {OneOffTasksPatchInput, OneOffTasksSpecInput} from '@/schemas';
import type {OneOffTaskSummary, OneOffTasksPatchResult} from '../types/plan';
import {PlanningError} from './planningService';
import {ensureSynced} from './syncService';

/** Throws a PlanningError naming every task id the patch cannot apply. */
function assertOneOffTasksPatchable(
  taskIds: string[],
  unfinishedTasks: TaskItem[],
) {
  const unfinishedTaskIds = new Set(unfinishedTasks.map(({id}) => id));
  const notFoundTaskIds = [
    ...new Set(taskIds.filter(taskId => !unfinishedTaskIds.has(taskId))),
  ];
  const repeatedTaskIds = findRepeatedIds(taskIds);

  const problems: string[] = [];
  if (notFoundTaskIds.length > 0) {
    problems.push(PLANNING_ERROR.ONE_OFF_TASKS_NOT_FOUND(notFoundTaskIds));
  }
  if (repeatedTaskIds.length > 0) {
    problems.push(PLANNING_ERROR.ONE_OFF_TASKS_LISTED_TWICE(repeatedTaskIds));
  }
  if (problems.length > 0) {
    throw new PlanningError(PLANNING_ERROR.PATCH_REJECTED(problems));
  }
}

/**
 * Add one-offs to the priority matrix (MCP `create_one_off_tasks`) in one
 * INSERT, in the order given. Puts nothing on a week: every new task is
 * UNTRACKED.
 */
export async function createOneOffTasks(
  userId: string,
  {tasks}: OneOffTasksSpecInput,
): Promise<{oneOffTasks: OneOffTaskSummary[]}> {
  const createdTasks = await createMatrixTasks(
    userId,
    tasks.map(toMatrixTaskRow),
  );
  // New tasks are on no plan, so the active plan can't change their state
  return {
    oneOffTasks: createdTasks.map(task => toOneOffTaskSummary(task, null)),
  };
}

/**
 * Mark one-offs done and move them between quadrants (MCP
 * `update_one_off_tasks`) in one transaction. A completion is the matrix's
 * Done: a task on no week joins this week's ACTIVE plan when there is one.
 * Rejected whole, nothing written, when an id isn't one of the user's
 * unfinished one-offs or is named twice.
 */
export async function patchOneOffTasks(
  userId: string,
  {completeTaskIds, reprioritizeTasks}: OneOffTasksPatchInput,
): Promise<OneOffTasksPatchResult> {
  // A finished week's plan flips first, so a completion never credits it
  const activePlan = await ensureSynced(userId);
  const activePlanId = activePlan?.id ?? null;
  const reprioritizeTaskIds = reprioritizeTasks.map(({taskId}) => taskId);

  assertOneOffTasksPatchable(
    [...completeTaskIds, ...reprioritizeTaskIds],
    await getNonDoneAdhocTasks(userId),
  );

  const {completedTasks, reprioritizedTasks} = await prisma.$transaction(
    async tx => {
      const completedTasks = await completeAdhocTasks(
        userId,
        completeTaskIds,
        activePlanId,
        tx,
      );
      const reprioritizedTasks: TaskItem[] = [];
      for (const quadrant of QUADRANT_ORDER) {
        const taskIds = reprioritizeTasks
          .filter(task => task.quadrant === quadrant)
          .map(({taskId}) => taskId);
        reprioritizedTasks.push(
          ...(await updateAdhocTaskQuadrants(userId, taskIds, quadrant, tx)),
        );
      }
      return {completedTasks, reprioritizedTasks};
    },
  );

  // Each list in the order the call named its tasks
  const toSummariesInOrder = (tasks: TaskItem[], taskIds: string[]) => {
    const taskById = new Map(tasks.map(task => [task.id, task]));
    return taskIds.flatMap(taskId => {
      const task = taskById.get(taskId);
      return task ? [toOneOffTaskSummary(task, activePlanId)] : [];
    });
  };
  return {
    completedTasks: toSummariesInOrder(completedTasks, completeTaskIds),
    reprioritizedTasks: toSummariesInOrder(
      reprioritizedTasks,
      reprioritizeTaskIds,
    ),
  };
}
