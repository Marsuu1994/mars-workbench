'use server';

import {revalidatePath} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {
  createProjectSchema,
  createProjectStepSchema,
  reorderProjectStepsSchema,
  updateProjectSchema,
  updateProjectStepSchema,
} from '../schemas';
import {
  addProjectStep,
  archiveProject,
  createProject,
  deleteProjectStep,
  reorderProjectSteps,
  scheduleProjectStep,
  unarchiveProject,
  unscheduleProjectStep,
  updateProject,
  updateProjectStep,
} from '../services/projectService';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';

const PROJECTS_PATH = '/kanban/projects';
const BOARD_PATH = '/kanban';

type ProjectErrorKey =
  'projectNotFound' | 'stepNotFound' | 'stepOrderMismatch' | 'noActivePlan';

const errorResult = async (errorKey: ProjectErrorKey) => {
  const t = await getTranslations('Errors');
  return {error: {formErrors: [t(errorKey)], fieldErrors: {}}};
};

/** Projects page + board: a step on this week is also a board card. */
const revalidateProjectsAndBoard = () => {
  revalidatePath(PROJECTS_PATH);
  revalidatePath(BOARD_PATH);
};

export async function createProjectAction(input: unknown) {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const project = await createProject(userId, parsed.data);

  revalidatePath(PROJECTS_PATH);
  return {data: project};
}

export async function updateProjectAction(projectId: string, input: unknown) {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await updateProject(userId, projectId, parsed.data);
  if ('error' in result) return errorResult(result.error);

  revalidatePath(PROJECTS_PATH);
  return {data: result.project};
}

export async function archiveProjectAction(projectId: string) {
  const userId = await getCurrentUserId();
  const result = await archiveProject(userId, projectId);
  if ('error' in result) return errorResult(result.error);

  // Unfinished steps leave the week
  revalidateProjectsAndBoard();
  return {data: result.project};
}

export async function unarchiveProjectAction(projectId: string) {
  const userId = await getCurrentUserId();
  const result = await unarchiveProject(userId, projectId);
  if ('error' in result) return errorResult(result.error);

  revalidatePath(PROJECTS_PATH);
  return {data: result.project};
}

export async function addProjectStepAction(projectId: string, input: unknown) {
  const parsed = createProjectStepSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await addProjectStep(userId, projectId, parsed.data);
  if ('error' in result) return errorResult(result.error);

  revalidatePath(PROJECTS_PATH);
  return {data: result.step};
}

export async function updateProjectStepAction(stepId: string, input: unknown) {
  const parsed = updateProjectStepSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await updateProjectStep(userId, stepId, parsed.data);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}

export async function deleteProjectStepAction(stepId: string) {
  const userId = await getCurrentUserId();
  const result = await deleteProjectStep(userId, stepId);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}

export async function reorderProjectStepsAction(
  projectId: string,
  input: unknown,
) {
  const parsed = reorderProjectStepsSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await reorderProjectSteps(
    userId,
    projectId,
    parsed.data.stepIds,
  );
  if ('error' in result) return errorResult(result.error);

  // Same-project steps on the board sort by step number
  revalidateProjectsAndBoard();
  return {data: result.project};
}

export async function scheduleProjectStepAction(stepId: string) {
  const userId = await getCurrentUserId();
  const result = await scheduleProjectStep(userId, stepId);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}

export async function unscheduleProjectStepAction(stepId: string) {
  const userId = await getCurrentUserId();
  const result = await unscheduleProjectStep(userId, stepId);
  if ('error' in result) return errorResult(result.error);

  revalidateProjectsAndBoard();
  return {data: result.step};
}
