import {z} from 'zod';
import prisma from '@/lib/prisma';
import {
  createProject as dalCreateProject,
  createProjectSteps,
  deleteProjectStep as dalDeleteProjectStep,
  getProjectStepById,
  getProjectWithStepsById,
  getProjectsWithSteps,
  renumberProjectSteps,
  scheduleProjectStep as dalScheduleProjectStep,
  shiftStepsAfterIndex,
  unlinkUnfinishedStepsByProjectId,
  unscheduleProjectStep as dalUnscheduleProjectStep,
  updateProject as dalUpdateProject,
  updateProjectArchived,
  updateProjectStep as dalUpdateProjectStep,
  type ProjectItem,
  type ProjectStepRow,
  type ProjectWithSteps,
} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/generated/prisma/client';
import {sizeToPoints} from '@/utils/sizeUtils';
import {ensureSynced} from '@/services/syncService';
import type {
  CreateProjectInput,
  CreateProjectStepInput,
  UpdateProjectInput,
  UpdateProjectStepInput,
} from '@/schemas';

type ProjectResult = {project: ProjectItem} | {error: 'projectNotFound'};
type StepResult<E extends string> = {step: TaskItem} | {error: E};
export type AddProjectStepResult = StepResult<'projectNotFound'>;
export type ProjectStepResult = StepResult<'stepNotFound'>;
export type ScheduleProjectStepResult = StepResult<
  'noActivePlan' | 'stepNotFound'
>;
export type ReorderProjectStepsResult =
  | {project: ProjectWithSteps}
  | {error: 'projectNotFound' | 'stepOrderMismatch'};

const uuidSchema = z.string().uuid();

/** Malformed ids (e.g. an LLM-invented one) never reach the uuid columns. */
const isUuid = (id: string) => uuidSchema.safeParse(id).success;

/** Empty optional text clears the field. */
const toNullableText = (text: string | undefined) =>
  text === undefined ? undefined : text || null;

/** Step rows numbered from `firstIndex`, with points derived from size. */
const toStepRows = (
  steps: CreateProjectStepInput[],
  firstIndex: number,
): ProjectStepRow[] =>
  steps.map(({title, description, size}, offset) => ({
    title,
    description: description || undefined,
    size,
    points: sizeToPoints(size),
    instanceIndex: firstIndex + offset,
  }));

// ── Projects ─────────────────────────────────────────────────────────────────

/** All of the user's projects with their steps (archived included). */
export async function listProjects(
  userId: string,
): Promise<ProjectWithSteps[]> {
  return getProjectsWithSteps(userId);
}

/** One project with its steps; null when it isn't the user's. */
export async function getProject(
  userId: string,
  projectId: string,
): Promise<ProjectWithSteps | null> {
  if (!isUuid(projectId)) return null;
  return getProjectWithStepsById(userId, projectId);
}

/**
 * Create a project, optionally with its first steps (numbered 1..n in input
 * order) — one transaction, so a project never exists half-written.
 */
export async function createProject(
  userId: string,
  input: CreateProjectInput,
): Promise<ProjectWithSteps> {
  const {title, goal, steps = []} = input;
  return prisma.$transaction(async tx => {
    const project = await dalCreateProject(
      userId,
      {title, goal: goal || null},
      tx,
    );
    const createdSteps = await createProjectSteps(
      userId,
      project.id,
      toStepRows(steps, 1),
      tx,
    );
    return {...project, steps: createdSteps};
  });
}

/** Rename a project or change its goal (an empty goal clears it). */
export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectResult> {
  if (!isUuid(projectId)) return {error: 'projectNotFound'};
  const {title, goal} = input;
  const project = await dalUpdateProject(userId, projectId, {
    title,
    goal: toNullableText(goal),
  });
  return project ? {project} : {error: 'projectNotFound'};
}

/**
 * Archive (the user's call, never automatic): the project's unfinished steps
 * leave the week and return to the project; done steps keep their plan link.
 */
export async function archiveProject(
  userId: string,
  projectId: string,
): Promise<ProjectResult> {
  if (!isUuid(projectId)) return {error: 'projectNotFound'};
  return prisma.$transaction(async tx => {
    const project = await updateProjectArchived(userId, projectId, true, tx);
    if (!project) return {error: 'projectNotFound'} as const;
    await unlinkUnfinishedStepsByProjectId(userId, projectId, tx);
    return {project};
  });
}

/** Unarchive: the project comes back with its path intact. */
export async function unarchiveProject(
  userId: string,
  projectId: string,
): Promise<ProjectResult> {
  if (!isUuid(projectId)) return {error: 'projectNotFound'};
  const project = await updateProjectArchived(userId, projectId, false);
  return project ? {project} : {error: 'projectNotFound'};
}

// ── Steps ────────────────────────────────────────────────────────────────────

/** Append a step to the end of the path, off the week (planId = null). */
export async function addProjectStep(
  userId: string,
  projectId: string,
  input: CreateProjectStepInput,
): Promise<AddProjectStepResult> {
  if (!isUuid(projectId)) return {error: 'projectNotFound'};
  return prisma.$transaction(async tx => {
    const project = await getProjectWithStepsById(userId, projectId, tx);
    if (!project) return {error: 'projectNotFound'} as const;
    const lastIndex = Math.max(
      0,
      ...project.steps.map(step => step.instanceIndex),
    );
    const [step] = await createProjectSteps(
      userId,
      projectId,
      toStepRows([input], lastIndex + 1),
      tx,
    );
    return {step};
  });
}

/**
 * Edit a step that isn't done; a new size re-derives its points. A step on
 * this week is its own board card, so the board shows the edit.
 */
export async function updateProjectStep(
  userId: string,
  stepId: string,
  input: UpdateProjectStepInput,
): Promise<ProjectStepResult> {
  if (!isUuid(stepId)) return {error: 'stepNotFound'};
  const {title, description, size} = input;
  const step = await dalUpdateProjectStep(userId, stepId, {
    title,
    description: toNullableText(description),
    ...(size !== undefined && {size, points: sizeToPoints(size)}),
  });
  return step ? {step} : {error: 'stepNotFound'};
}

/**
 * Delete a step that isn't done; the steps after it move up one. Deleting a
 * step that is on this week also takes it off the board (it's the same row).
 */
export async function deleteProjectStep(
  userId: string,
  stepId: string,
): Promise<ProjectStepResult> {
  if (!isUuid(stepId)) return {error: 'stepNotFound'};
  return prisma.$transaction(async tx => {
    const step = await getProjectStepById(userId, stepId, tx);
    if (!step || !step.projectId || step.status === TaskStatus.DONE) {
      return {error: 'stepNotFound'} as const;
    }
    const {count} = await dalDeleteProjectStep(userId, stepId, tx);
    if (count === 0) return {error: 'stepNotFound'} as const;
    await shiftStepsAfterIndex(userId, step.projectId, step.instanceIndex, tx);
    return {step};
  });
}

/**
 * Reorder the project's unfinished steps. `stepIds` must list exactly those
 * steps, in their new order; they take over the step numbers the unfinished
 * steps already hold (ascending), so done steps keep theirs and the numbers
 * stay contiguous. One transaction.
 */
export async function reorderProjectSteps(
  userId: string,
  projectId: string,
  stepIds: string[],
): Promise<ReorderProjectStepsResult> {
  if (!isUuid(projectId)) return {error: 'projectNotFound'};
  return prisma.$transaction(async tx => {
    const project = await getProjectWithStepsById(userId, projectId, tx);
    if (!project) return {error: 'projectNotFound'} as const;

    const unfinishedSteps = project.steps.filter(
      step => step.status !== TaskStatus.DONE,
    );
    const unfinishedStepIds = new Set(unfinishedSteps.map(step => step.id));
    const listsEveryUnfinishedStepOnce =
      stepIds.length === unfinishedSteps.length &&
      new Set(stepIds).size === stepIds.length &&
      stepIds.every(stepId => unfinishedStepIds.has(stepId));
    if (!listsEveryUnfinishedStepOnce) {
      return {error: 'stepOrderMismatch'} as const;
    }

    const stepIndexes = unfinishedSteps
      .map(step => step.instanceIndex)
      .sort((left, right) => left - right);
    await renumberProjectSteps(userId, projectId, stepIds, stepIndexes, tx);

    const reorderedProject = await getProjectWithStepsById(
      userId,
      projectId,
      tx,
    );
    return {project: reorderedProject!};
  });
}

/**
 * Schedule Step: put an unscheduled step on the current-week ACTIVE plan.
 * The step lands in the board's backlog (status stays BACKLOG). Any upcoming
 * step can go, in any order; steps of archived projects can't.
 */
export async function scheduleProjectStep(
  userId: string,
  stepId: string,
): Promise<ScheduleProjectStepResult> {
  if (!isUuid(stepId)) return {error: 'stepNotFound'};
  const activePlan = await ensureSynced(userId);
  if (!activePlan) return {error: 'noActivePlan'};

  const step = await dalScheduleProjectStep(userId, stepId, activePlan.id);
  return step ? {step} : {error: 'stepNotFound'};
}

/** Take back a scheduled step still in the backlog (planId = null). */
export async function unscheduleProjectStep(
  userId: string,
  stepId: string,
): Promise<ProjectStepResult> {
  if (!isUuid(stepId)) return {error: 'stepNotFound'};
  const step = await dalUnscheduleProjectStep(userId, stepId);
  return step ? {step} : {error: 'stepNotFound'};
}
