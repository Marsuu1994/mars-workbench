import prisma from '@/lib/prisma';
import {
  Prisma,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/generated/prisma/client';
import {taskSelect, type TaskItem} from '@/lib/db/tasks';

export type ProjectItem = {
  id: string;
  title: string;
  goal: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** A project with its steps (PROJECT tasks), ordered by step number. */
export type ProjectWithSteps = ProjectItem & {steps: TaskItem[]};

/** One step row to insert; the service derives points and the step number. */
export type ProjectStepRow = {
  title: string;
  description?: string;
  size: TaskSize;
  points: number;
  instanceIndex: number;
};

const projectSelect = {
  id: true,
  title: true,
  goal: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

const stepsInclude = {
  tasks: {
    where: {type: TaskType.PROJECT},
    orderBy: [{instanceIndex: 'asc'}, {createdAt: 'asc'}],
    select: taskSelect,
  },
} satisfies Prisma.ProjectSelect;

const toProjectWithSteps = ({
  tasks,
  ...project
}: ProjectItem & {tasks: TaskItem[]}): ProjectWithSteps => ({
  ...project,
  steps: tasks,
});

// ── Projects ─────────────────────────────────────────────────────────────────

/**
 * All of a user's projects (archived included — the page lists them apart)
 * with their steps, newest project first. One query; progress, next step and
 * "All steps done" are derived from the steps in memory.
 */
export async function getProjectsWithSteps(
  userId: string,
): Promise<ProjectWithSteps[]> {
  const projects = await prisma.project.findMany({
    where: {userId},
    orderBy: [{createdAt: 'desc'}, {id: 'asc'}],
    select: {...projectSelect, ...stepsInclude},
  });
  return projects.map(toProjectWithSteps);
}

/** One project with its steps; null when it doesn't exist or isn't the user's. */
export async function getProjectWithStepsById(
  userId: string,
  projectId: string,
  tx?: Prisma.TransactionClient,
): Promise<ProjectWithSteps | null> {
  const db = tx ?? prisma;
  const project = await db.project.findFirst({
    where: {id: projectId, userId},
    select: {...projectSelect, ...stepsInclude},
  });
  return project ? toProjectWithSteps(project) : null;
}

export async function createProject(
  userId: string,
  data: {title: string; goal: string | null},
  tx?: Prisma.TransactionClient,
): Promise<ProjectItem> {
  const db = tx ?? prisma;
  return db.project.create({
    data: {...data, userId},
    select: projectSelect,
  });
}

/** Update title / goal, owner-scoped. Null when not found or not owned. */
export async function updateProject(
  userId: string,
  projectId: string,
  data: {title?: string; goal?: string | null},
): Promise<ProjectItem | null> {
  const [project] = await prisma.project.updateManyAndReturn({
    where: {id: projectId, userId},
    data,
    select: projectSelect,
  });
  return project ?? null;
}

/** Archive or unarchive, owner-scoped. Null when not found or not owned. */
export async function updateProjectArchived(
  userId: string,
  projectId: string,
  isArchived: boolean,
  tx?: Prisma.TransactionClient,
): Promise<ProjectItem | null> {
  const db = tx ?? prisma;
  const [project] = await db.project.updateManyAndReturn({
    where: {id: projectId, userId},
    data: {isArchived},
    select: projectSelect,
  });
  return project ?? null;
}

// ── Steps ────────────────────────────────────────────────────────────────────

/** A step by id, owner-scoped; null when it isn't one of the user's steps. */
export async function getProjectStepById(
  userId: string,
  stepId: string,
  tx?: Prisma.TransactionClient,
): Promise<TaskItem | null> {
  const db = tx ?? prisma;
  return db.task.findFirst({
    where: {id: stepId, userId, type: TaskType.PROJECT},
    select: taskSelect,
  });
}

/**
 * Insert steps for a project. Every new step is off the week (planId = null)
 * and BACKLOG; the caller numbers them.
 */
export async function createProjectSteps(
  userId: string,
  projectId: string,
  steps: ProjectStepRow[],
  tx?: Prisma.TransactionClient,
): Promise<TaskItem[]> {
  if (steps.length === 0) return [];
  const db = tx ?? prisma;
  return db.task.createManyAndReturn({
    data: steps.map(step => ({
      ...step,
      userId,
      projectId,
      planId: null,
      type: TaskType.PROJECT,
      status: TaskStatus.BACKLOG,
    })),
    select: taskSelect,
  });
}

/**
 * Edit a step that isn't done (done steps are locked: they carry points
 * history). The same row is the board card when the step is on the week.
 */
export async function updateProjectStep(
  userId: string,
  stepId: string,
  data: {
    title?: string;
    description?: string | null;
    size?: TaskSize;
    points?: number;
  },
): Promise<TaskItem | null> {
  const [step] = await prisma.task.updateManyAndReturn({
    where: {
      id: stepId,
      userId,
      type: TaskType.PROJECT,
      status: {not: TaskStatus.DONE},
    },
    data,
    select: taskSelect,
  });
  return step ?? null;
}

/** Delete a step that isn't done; count 0 when nothing matched. */
export async function deleteProjectStep(
  userId: string,
  stepId: string,
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.deleteMany({
    where: {
      id: stepId,
      userId,
      type: TaskType.PROJECT,
      status: {not: TaskStatus.DONE},
    },
  });
}

/** Move every step after `deletedIndex` up one, keeping the numbers contiguous. */
export async function shiftStepsAfterIndex(
  userId: string,
  projectId: string,
  deletedIndex: number,
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      projectId,
      type: TaskType.PROJECT,
      instanceIndex: {gt: deletedIndex},
    },
    data: {instanceIndex: {decrement: 1}},
  });
}

/**
 * Renumber a project's unfinished steps in one statement: stepIds[i] gets
 * stepIndexes[i]. Scoped to the owner, the project and non-DONE steps.
 * uq_task_daily / uq_task_weekly include templateId, which is NULL for steps,
 * so no intermediate numbering can collide.
 */
export async function renumberProjectSteps(
  userId: string,
  projectId: string,
  stepIds: string[],
  stepIndexes: number[],
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const db = tx ?? prisma;
  return db.$executeRaw`
    UPDATE tasks AS task
    SET instance_index = renumbered.step_index, updated_at = now()
    FROM unnest(${stepIds}::uuid[], ${stepIndexes}::int[])
      AS renumbered(step_id, step_index)
    WHERE task.id = renumbered.step_id
      AND task.user_id = ${userId}::uuid
      AND task.project_id = ${projectId}::uuid
      AND task.type = 'PROJECT'
      AND task.status <> 'DONE'
  `;
}

/**
 * Schedule: put an unscheduled step (planId = null, BACKLOG) of a
 * non-archived project on a plan. The step lands in the board's backlog.
 */
export async function scheduleProjectStep(
  userId: string,
  stepId: string,
  planId: string,
): Promise<TaskItem | null> {
  const [step] = await prisma.task.updateManyAndReturn({
    where: {
      id: stepId,
      userId,
      type: TaskType.PROJECT,
      planId: null,
      status: TaskStatus.BACKLOG,
      project: {isArchived: false},
    },
    data: {planId},
    select: taskSelect,
  });
  return step ?? null;
}

/**
 * Take back a scheduled step that is still in the backlog: it returns to its
 * place in the project (planId = null). Steps already on the board leave the
 * week only through the plan's deselect.
 */
export async function unscheduleProjectStep(
  userId: string,
  stepId: string,
): Promise<TaskItem | null> {
  const [step] = await prisma.task.updateManyAndReturn({
    where: {
      id: stepId,
      userId,
      type: TaskType.PROJECT,
      planId: {not: null},
      status: TaskStatus.BACKLOG,
    },
    data: {planId: null},
    select: taskSelect,
  });
  return step ?? null;
}

/**
 * Link steps to a plan (plan creation / update), owner-scoped and limited to
 * unfinished steps. Status is kept: a carried-over step stays where it was.
 */
export async function linkProjectStepsToPlan(
  userId: string,
  stepIds: string[],
  planId: string,
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  if (stepIds.length === 0) return {count: 0};
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      id: {in: stepIds},
      type: TaskType.PROJECT,
      status: {not: TaskStatus.DONE},
    },
    data: {planId},
  });
}

/**
 * Return a project's unfinished steps from any plan (archive): planId = null,
 * BACKLOG, step numbers unchanged. Done steps keep their plan link.
 */
export async function unlinkUnfinishedStepsByProjectId(
  userId: string,
  projectId: string,
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      projectId,
      type: TaskType.PROJECT,
      status: {not: TaskStatus.DONE},
    },
    data: {planId: null, status: TaskStatus.BACKLOG},
  });
}

/** Ids of a plan's unfinished steps (default carry-over candidates). */
export async function getUnfinishedStepIdsByPlanId(
  userId: string,
  planId: string,
): Promise<string[]> {
  const steps = await prisma.task.findMany({
    where: {
      userId,
      planId,
      type: TaskType.PROJECT,
      status: {not: TaskStatus.DONE},
    },
    orderBy: [{projectId: 'asc'}, {instanceIndex: 'asc'}],
    select: {id: true},
  });
  return steps.map(step => step.id);
}
