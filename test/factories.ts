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
  type BoardMoveStatus,
} from '@/lib/db/tasks';
import {prisma} from '@/lib/prisma';
import {planSpecSchema} from '@/schemas';
import {createPlanFromSpec} from '@/services/planningService';
import {createProject} from '@/services/projectService';
import {runEndOfPeriodSync} from '@/services/syncService';
import {PriorityQuadrant, TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {toMatrixTaskRow} from '@/utils/oneOffUtils';
import {formatISODate, getISOWeekKey, getTodayDate} from '@/utils/dateUtils';
import {getWeekDates} from '@/utils/dayRingUtils';
import {sizeToPoints} from '@/utils/sizeUtils';

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

/**
 * Ends a plan's week the way Monday's sync does: its unfinished habit tasks
 * expire, and the plan waits for the next week's (`PENDING_UPDATE`).
 */
export const endWeek = (userId: string, planId: string) =>
  runEndOfPeriodSync(userId, planId);

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
  moves: [title: string, status: BoardMoveStatus][],
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
  moves: [taskId: string, status: BoardMoveStatus][],
) => {
  for (const [taskId, status] of moves) {
    await updateTaskStatus(userId, taskId, status);
  }
};

/**
 * Finishes project steps the way the app does: this week's plan takes them
 * (with a daily run beside them), then they move to Done on the board.
 */
export const finishStepsThisWeek = async (
  userId: string,
  stepIds: string[],
) => {
  const week = await createWeek(userId, {
    newTemplates: [newHabit('Run', TaskType.DAILY)],
    addProjectStepIds: stepIds,
  });
  await moveTasks(
    userId,
    stepIds.map(stepId => [stepId, TaskStatus.DONE]),
  );
  return week;
};

/**
 * This week's days as "YYYY-MM-DD", Monday first, and where today is among
 * them (0 for Monday), in KANBAN_TZ: the real week, since the server's
 * clock can't be frozen.
 */
export const getThisWeek = () => {
  const today = getTodayDate();
  const dates = getWeekDates(getISOWeekKey(today));
  return {dates, todayIndex: dates.indexOf(formatISODate(today))};
};

interface EarlierDay {
  /** The day, "YYYY-MM-DD" in KANBAN_TZ, before today */
  date: string;
  /** The week's daily habit, by its title */
  habitTitle: string;
  /** How many of the habit's tasks that day were done */
  doneCount: number;
  /** How many of them expired undone */
  expiredCount: number;
  /** The user's other tasks finished that day, by title */
  alsoFinished?: string[];
}

/**
 * An earlier day of this week, as the daily sync and the board left it: the
 * daily habit's tasks for that day, some done and the rest expired, and
 * other tasks finished on it. The app only ever makes today's daily tasks
 * and stamps a finish with the moment it happens, so no service can write a
 * past day: these rows are written straight to the table.
 */
export const createEarlierDay = async (
  userId: string,
  planId: string,
  {date, habitTitle, doneCount, expiredCount, alsoFinished = []}: EarlierDay,
) => {
  const template = await prisma.taskTemplate.findFirstOrThrow({
    where: {userId, title: habitTitle},
  });
  // A DATE column holds the day at UTC midnight; 20:00 UTC is midday in Los
  // Angeles (noon or 1 PM, by the season), well inside the day
  const forDate = new Date(`${date}T00:00:00Z`);
  const doneAt = new Date(`${date}T20:00:00Z`);
  await prisma.task.createMany({
    data: Array.from({length: doneCount + expiredCount}, (_, index) => {
      const isDone = index < doneCount;
      return {
        userId,
        planId,
        templateId: template.id,
        type: TaskType.DAILY,
        title: template.title,
        description: template.description,
        size: template.size,
        points: sizeToPoints(template.size),
        status: isDone ? TaskStatus.DONE : TaskStatus.EXPIRED,
        forDate,
        instanceIndex: index,
        doneAt: isDone ? doneAt : null,
      };
    }),
  });
  if (alsoFinished.length > 0) {
    await prisma.task.updateMany({
      where: {userId, title: {in: alsoFinished}},
      data: {status: TaskStatus.DONE, doneAt},
    });
  }
};
