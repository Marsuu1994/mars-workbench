/**
 * Builders for test data, written through the app's services and DAL — the
 * same paths the pages and MCP tools take. Integration and e2e tests call
 * them for a fresh user each (e2e through the `seed` fixture, `e2e/fixtures.ts`);
 * the dev seed builds its week from them (`test/seedWeek.ts`).
 */
import {randomUUID} from 'node:crypto';
import type {z} from 'zod';
import {
  createMatrixTasks,
  getBoardTasksByPlanId,
  updateTaskStatus,
} from '@/lib/db/tasks';
import {planSpecSchema} from '@/schemas';
import {createPlanFromSpec} from '@/services/planningService';
import {createProject} from '@/services/projectService';
import {PriorityQuadrant, TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {toMatrixTaskRow} from '@/utils/oneOffUtils';

/** A user no other test touches: every query is scoped by userId. */
export const newUserId = () => randomUUID();

type HabitType = typeof TaskType.DAILY | typeof TaskType.WEEKLY;

/** A brand-new habit for `createWeek`'s `newTemplates`. */
export const newHabit = (
  title: string,
  type: HabitType,
  frequency = 1,
  size: TaskSize = TaskSize.SMALL,
) => ({title, description: `${title}, as planned`, size, type, frequency});

/** This week's plan from a `create_plan` spec (defaults filled by the schema). */
export const createWeek = (
  userId: string,
  planSpec: z.input<typeof planSpecSchema>,
) => createPlanFromSpec(userId, planSpecSchema.parse(planSpec));

/** A project whose steps are named by title, each SMALL unless given. */
export const createProjectWithSteps = (
  userId: string,
  title: string,
  steps: (string | {title: string; size: TaskSize})[],
  goal?: string,
) =>
  createProject(userId, {
    title,
    goal,
    steps: steps.map(step =>
      typeof step === 'string' ? {title: step, size: TaskSize.SMALL} : step,
    ),
  });

interface OneOffInput {
  title: string;
  quadrant?: PriorityQuadrant;
  size?: TaskSize;
}

/** A one-off on the priority matrix, on no plan yet. */
export const createOneOff = async (
  userId: string,
  {
    title,
    quadrant = PriorityQuadrant.DO_FIRST,
    size = TaskSize.SMALL,
  }: OneOffInput,
) => {
  const [oneOff] = await createMatrixTasks(userId, [
    toMatrixTaskRow({title, size, quadrant}),
  ]);
  return oneOff;
};

/**
 * Moves a week's tasks across the board by title, in order: each move takes
 * the first card with that title, so a habit moves today's instance first.
 */
export const moveTasksByTitle = async (
  userId: string,
  planId: string,
  moves: [title: string, status: TaskStatus][],
) => {
  const tasks = await getBoardTasksByPlanId(userId, planId);
  await moveTasks(
    userId,
    moves.map(([title, status]) => {
      const task = tasks.find(boardTask => boardTask.title === title);
      if (!task) throw new Error(`No task titled "${title}" on the week`);
      return [task.id, status];
    }),
  );
};

/** Moves tasks across the board, in order. */
export const moveTasks = async (
  userId: string,
  moves: [taskId: string, status: TaskStatus][],
) => {
  for (const [taskId, status] of moves) {
    await updateTaskStatus(userId, taskId, status);
  }
};
