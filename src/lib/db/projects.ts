import {prisma} from '@/lib/prisma';
import {
  Prisma,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/generated/prisma/client';
import {taskSelect, type TaskItem} from '@/lib/db/tasks';
import {updateOrNull} from '@/lib/db/updateOrNull';

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
  tx?: Prisma.TransactionClient,
): Promise<ProjectItem | null> {
  const db = tx ?? prisma;
  const [project] = await db.project.updateManyAndReturn({
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
  tx?: Prisma.TransactionClient,
): Promise<TaskItem | null> {
  const db = tx ?? prisma;
  const [step] = await db.task.updateManyAndReturn({
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

/** Delete several steps of a project that aren't done; count of deleted. */
export async function deleteProjectSteps(
  userId: string,
  projectId: string,
  stepIds: string[],
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  if (stepIds.length === 0) return {count: 0};
  const db = tx ?? prisma;
  return db.task.deleteMany({
    where: {
      id: {in: stepIds},
      userId,
      projectId,
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
 * Renumber a project's path in one statement: stepIds[i] gets stepNumbers[i].
 * Done steps are renumbered too (they keep their place in the path; only the
 * numbers close up). Scoped to the owner and the project. uq_task_daily /
 * uq_task_weekly include templateId, which is NULL for steps, so no
 * intermediate numbering can collide.
 */
export async function renumberProjectPath(
  userId: string,
  projectId: string,
  stepIds: string[],
  stepNumbers: number[],
  tx?: Prisma.TransactionClient,
): Promise<number> {
  if (stepIds.length === 0) return 0;
  const db = tx ?? prisma;
  return db.$executeRaw`
    UPDATE tasks AS task
    SET instance_index = renumbered.step_number, updated_at = now()
    FROM unnest(${stepIds}::uuid[], ${stepNumbers}::int[])
      AS renumbered(step_id, step_number)
    WHERE task.id = renumbered.step_id
      AND task.user_id = ${userId}::uuid
      AND task.project_id = ${projectId}::uuid
      AND task.type = 'PROJECT'
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
  return updateOrNull(
    prisma.task.update({
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
    }),
  );
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
  return updateOrNull(
    prisma.task.update({
      where: {
        id: stepId,
        userId,
        type: TaskType.PROJECT,
        planId: {not: null},
        status: TaskStatus.BACKLOG,
      },
      data: {planId: null},
      select: taskSelect,
    }),
  );
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

// ── Reads for the board and the plan form ────────────────────────────────────

/** A project as a board step card reads it: its title and its path. */
export type BoardProject = {
  id: string;
  title: string;
  /** Every step, in path order */
  steps: {id: string; status: TaskStatus; instanceIndex: number}[];
};

/**
 * The projects behind the board's step cards (every project with a step on
 * this plan that hasn't expired), with every step's status and number: the
 * card's path. One join, grouped here, so it runs alongside the board's
 * tasks rather than after them.
 */
export async function getProjectPathsByPlanId(
  userId: string,
  planId: string,
): Promise<BoardProject[]> {
  const rows = await prisma.$queryRaw<
    {
      projectId: string;
      title: string;
      stepId: string;
      status: TaskStatus;
      instanceIndex: number;
    }[]
  >`
    SELECT
      projects.id AS "projectId",
      projects.title,
      steps.id AS "stepId",
      steps.status,
      steps.instance_index AS "instanceIndex"
    FROM projects
    JOIN tasks AS steps
      ON steps.project_id = projects.id AND steps.type = 'PROJECT'
    WHERE projects.user_id = ${userId}::uuid
      AND EXISTS (
        SELECT 1 FROM tasks AS board_steps
        WHERE board_steps.project_id = projects.id
          AND board_steps.plan_id = ${planId}::uuid
          AND board_steps.user_id = ${userId}::uuid
          AND board_steps.status <> 'EXPIRED'
      )
    ORDER BY projects.created_at, projects.id, steps.instance_index,
      steps.created_at
  `;

  const projectById = new Map<string, BoardProject>();
  for (const {projectId, title, stepId, status, instanceIndex} of rows) {
    const project = projectById.get(projectId) ?? {
      id: projectId,
      title,
      steps: [],
    };
    project.steps.push({id: stepId, status, instanceIndex});
    projectById.set(projectId, project);
  }
  return [...projectById.values()];
}

/** A plan's unfinished step as the plan form lists it. */
export type PlanStepItem = {
  id: string;
  title: string;
  size: TaskSize;
  points: number;
  status: TaskStatus;
  /** The step number in its project */
  instanceIndex: number;
  projectTitle: string;
};

/**
 * A plan's unfinished steps with their project's title — the plan form's
 * Project Steps (the pending plan's when creating, this plan's when editing).
 * Grouped by project, newest project first, then in path order.
 */
export async function getPlanStepsByPlanId(
  userId: string,
  planId: string,
): Promise<PlanStepItem[]> {
  const steps = await prisma.task.findMany({
    where: {
      userId,
      planId,
      type: TaskType.PROJECT,
      status: {not: TaskStatus.DONE},
    },
    orderBy: [{project: {createdAt: 'desc'}}, {instanceIndex: 'asc'}],
    select: {
      id: true,
      title: true,
      size: true,
      points: true,
      status: true,
      instanceIndex: true,
      project: {select: {title: true}},
    },
  });
  return steps.map(({project, ...step}) => ({
    ...step,
    projectTitle: project?.title ?? '',
  }));
}
