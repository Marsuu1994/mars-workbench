import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {
  createProject as dalCreateProject,
  createProjectSteps,
  deleteProjectStep as dalDeleteProjectStep,
  getProjectStepById,
  getProjectWithStepsById,
  getProjectsWithSteps,
  renumberProjectPath,
  scheduleProjectStep as dalScheduleProjectStep,
  shiftStepsAfterIndex,
  unlinkUnfinishedStepsByProjectId,
  unscheduleProjectStep as dalUnscheduleProjectStep,
  updateProject as dalUpdateProject,
  updateProjectArchived,
  updateProjectStep as dalUpdateProjectStep,
  type ProjectItem,
  type ProjectWithSteps,
} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/generated/prisma/client';
import {sizeToPoints} from '@/utils/sizeUtils';
import {
  PROJECT_STEP_LIMIT,
  applyStepPatch,
  getNextStepNumber,
  hasNoStepConflicts,
  numberStepPath,
  toNullableText,
  toProjectStepRow,
} from '@/utils/projectUtils';
import {ensureSynced} from '@/services/syncService';
import type {ProjectsPageData} from '@/types/projects';
import type {
  CreateProjectInput,
  CreateProjectStepInput,
  MoveProjectStepInput,
  UpdateProjectInput,
  UpdateProjectStepInput,
} from '@/schemas';

type ProjectResult = {project: ProjectItem} | {error: 'projectNotFound'};
type StepResult<E extends string> = {step: TaskItem} | {error: E};
export type AddProjectStepResult = StepResult<
  'projectNotFound' | 'stepLimitReached'
>;
export type ProjectStepResult = StepResult<'stepNotFound'>;
export type ScheduleProjectStepResult = StepResult<
  'noActivePlan' | 'stepNotFound'
>;
export type MoveProjectStepResult =
  {project: ProjectWithSteps} | {error: 'projectNotFound' | 'stepNotFound'};

const uuidSchema = z.string().uuid();

/** Malformed ids (e.g. an LLM-invented one) never reach the uuid columns. */
const isUuid = (id: string) => uuidSchema.safeParse(id).success;

/** Step rows numbered from `firstIndex`, with points derived from size. */
const toStepRows = (steps: CreateProjectStepInput[], firstIndex: number) =>
  steps.map((step, offset) => toProjectStepRow(step, firstIndex + offset));

// ── Projects ─────────────────────────────────────────────────────────────────

/**
 * The Projects page's inputs: every project (archived included), their steps
 * flat — the page keeps those as state for its optimistic writes — and the
 * plan "+ This week" schedules into (null: no plan this week yet).
 */
export async function fetchProjectsPage(
  userId: string,
): Promise<ProjectsPageData> {
  const activePlan = await ensureSynced(userId);
  const projectsWithSteps = await getProjectsWithSteps(userId);

  const projects: ProjectItem[] = [];
  const steps: TaskItem[] = [];
  for (const {steps: projectSteps, ...project} of projectsWithSteps) {
    projects.push(project);
    steps.push(...projectSteps);
  }
  return {projects, steps, activePlanId: activePlan?.id ?? null};
}

/**
 * Create a project, optionally with its first steps (numbered 1..n in input
 * order; the schema caps them at PROJECT_STEP_LIMIT) — one transaction, so a
 * project never exists half-written.
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

/**
 * Append a step to the end of the path, off the week (planId = null). A path
 * holds at most PROJECT_STEP_LIMIT steps.
 */
export async function addProjectStep(
  userId: string,
  projectId: string,
  input: CreateProjectStepInput,
): Promise<AddProjectStepResult> {
  if (!isUuid(projectId)) return {error: 'projectNotFound'};
  return prisma.$transaction(async tx => {
    const project = await getProjectWithStepsById(userId, projectId, tx);
    if (!project) return {error: 'projectNotFound'} as const;
    if (project.steps.length >= PROJECT_STEP_LIMIT) {
      return {error: 'stepLimitReached'} as const;
    }
    const [step] = await createProjectSteps(
      userId,
      projectId,
      toStepRows([input], getNextStepNumber(project.steps)),
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
 * Move a step that isn't done right before another one, or to the end of the
 * path; the whole path is renumbered. Uses the same `applyStepPatch` as the
 * Projects page's optimistic drag and MCP's update_project, so all three
 * number a path alike. One transaction.
 */
export async function moveProjectStep(
  userId: string,
  projectId: string,
  {stepId, beforeStepId}: MoveProjectStepInput,
): Promise<MoveProjectStepResult> {
  if (!isUuid(projectId)) return {error: 'projectNotFound'};
  return prisma.$transaction(async tx => {
    const project = await getProjectWithStepsById(userId, projectId, tx);
    if (!project) return {error: 'projectNotFound'} as const;

    const {path, conflicts} = applyStepPatch(project.steps, {
      addSteps: [],
      moveSteps: [{stepId, beforeStepId}],
      updateStepIds: [],
      removeStepIds: [],
    });
    if (!hasNoStepConflicts(conflicts)) return {error: 'stepNotFound'} as const;

    const {numberByStepId} = numberStepPath(path);
    await renumberProjectPath(
      userId,
      projectId,
      [...numberByStepId.keys()],
      [...numberByStepId.values()],
      tx,
    );

    const movedProject = await getProjectWithStepsById(userId, projectId, tx);
    return {project: movedProject!};
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
