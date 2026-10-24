'use server';

import {revalidatePath} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {
  createProjectSchema,
  createProjectStepSchema,
  moveProjectStepSchema,
  updateProjectSchema,
  updateProjectStepSchema,
} from '../schemas';
import {
  addProjectStep,
  archiveProject,
  createProject,
  deleteProjectStep,
  fetchProjectsPage,
  moveProjectStep,
  scheduleProjectStep,
  unarchiveProject,
  unscheduleProjectStep,
  updateProject,
  updateProjectStep,
} from '../services/projectService';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import type {ProjectItem, ProjectWithSteps} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import type {FlattenedFormError} from '@/utils/formErrors';

const PROJECTS_PATH = '/kanban/projects';
const BOARD_PATH = '/kanban';

type ProjectErrorKey =
  'projectNotFound' | 'stepNotFound' | 'stepLimitReached' | 'noActivePlan';

/**
 * What a project action returns: its data, or the error a form's banner reads
 * (zod's flatten() shape). Both members declare both keys, so callers can
 * test `result.error` and read `result.data` after it.
 */
type ProjectActionResult<T> =
  {data: T; error?: undefined} | {error: FlattenedFormError; data?: undefined};

const errorResult = async (
  errorKey: ProjectErrorKey,
): Promise<ProjectActionResult<never>> => {
  const t = await getTranslations('Errors');
  return {error: {formErrors: [t(errorKey)], fieldErrors: {}}};
};

const revalidateProjects = () => revalidatePath(PROJECTS_PATH);

/** Projects page + board: a step on this week is also a board card. */
const revalidateProjectsAndBoard = () => {
  revalidateProjects();
  revalidatePath(BOARD_PATH);
};

export async function fetchProjectsPageAction() {
  const userId = await getCurrentUserId();
  return fetchProjectsPage(userId);
}

export async function createProjectAction(
  input: unknown,
): Promise<ProjectActionResult<ProjectWithSteps>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const project = await createProject(userId, parsed.data);

  revalidateProjects();
  return {data: project};
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult<ProjectItem>> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await updateProject(userId, projectId, parsed.data);
  if ('error' in result) return errorResult(result.error);

  revalidateProjects();
  return {data: result.project};
}

export async function archiveProjectAction(
  projectId: string,
): Promise<ProjectActionResult<ProjectItem>> {
  const userId = await getCurrentUserId();
  const result = await archiveProject(userId, projectId);
  if ('error' in result) return errorResult(result.error);

  // Unfinished steps leave the week
  revalidateProjectsAndBoard();
  return {data: result.project};
}

export async function unarchiveProjectAction(
  projectId: string,
): Promise<ProjectActionResult<ProjectItem>> {
  const userId = await getCurrentUserId();
  const result = await unarchiveProject(userId, projectId);
  if ('error' in result) return errorResult(result.error);

  revalidateProjects();
  return {data: result.project};
}

export async function addProjectStepAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult<TaskItem>> {
  const parsed = createProjectStepSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await addProjectStep(userId, projectId, parsed.data);
  if ('error' in result) return errorResult(result.error);

  revalidateProjects();
  return {data: result.step};
}

export async function updateProjectStepAction(
  stepId: string,
  input: unknown,
): Promise<ProjectActionResult<TaskItem>> {
  const parsed = updateProjectStepSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await updateProjectStep(userId, stepId, parsed.data);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}

export async function deleteProjectStepAction(
  stepId: string,
): Promise<ProjectActionResult<TaskItem>> {
  const userId = await getCurrentUserId();
  const result = await deleteProjectStep(userId, stepId);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}

export async function moveProjectStepAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult<ProjectWithSteps>> {
  const parsed = moveProjectStepSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await moveProjectStep(userId, projectId, parsed.data);
  if ('error' in result) return errorResult(result.error);

  // Same-project steps on the board sort by step number
  revalidateProjectsAndBoard();
  return {data: result.project};
}

export async function scheduleProjectStepAction(
  stepId: string,
): Promise<ProjectActionResult<TaskItem>> {
  const userId = await getCurrentUserId();
  const result = await scheduleProjectStep(userId, stepId);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}

export async function unscheduleProjectStepAction(
  stepId: string,
): Promise<ProjectActionResult<TaskItem>> {
  const userId = await getCurrentUserId();
  const result = await unscheduleProjectStep(userId, stepId);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}
