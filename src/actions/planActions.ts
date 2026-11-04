'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {createPlanSchema, updatePlanSchema} from '@/schemas';
import {
  createPlan,
  fetchEditPlanForm,
  fetchNewPlanForm,
  countIncompleteInstancesByTemplateId,
  updatePlan,
  PlanNotActiveError,
  TemplateNotFoundError,
} from '../services/planService';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import {BOARD_PATH} from '@/utils/planUtils';

/** A save the service refused, as the form's error. */
const planFormError = async (
  key: 'activePlanExists' | 'planNotActive' | 'templateNotFound',
) => {
  const t = await getTranslations('Errors');
  return {error: {formErrors: [t(key)], fieldErrors: {}}};
};

export async function fetchNewPlanFormAction() {
  const userId = await getCurrentUserId();
  return fetchNewPlanForm(userId);
}

export async function fetchEditPlanFormAction(planId: string) {
  const userId = await getCurrentUserId();
  return fetchEditPlanForm(userId, planId);
}

/**
 * Saves a new plan and lands on its board. The redirect brings the board back
 * in this one response, so the form page being left isn't rendered again.
 */
export async function createPlanAction(input: unknown) {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  try {
    const result = await createPlan(userId, parsed.data);
    if ('error' in result) return planFormError(result.error);
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return planFormError('templateNotFound');
    }
    throw error;
  }

  revalidatePath(BOARD_PATH);
  // Deselected ad-hoc tasks return to the matrix; carried ones become tracked
  revalidatePath('/kanban/priorities');
  // Carried steps stay on the week, deselected ones return to their project
  revalidatePath('/kanban/projects');
  redirect(BOARD_PATH);
}

/** Saves the plan's changes and lands on its board, like createPlanAction. */
export async function updatePlanAction(planId: string, input: unknown) {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  try {
    const result = await updatePlan(userId, planId, parsed.data);
    if ('error' in result) return planFormError(result.error);
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return planFormError('templateNotFound');
    }
    // The week ended between the check and the save
    if (error instanceof PlanNotActiveError) {
      return planFormError('planNotActive');
    }
    throw error;
  }

  revalidatePath(BOARD_PATH);
  // Deselected ad-hoc tasks return to the matrix
  revalidatePath('/kanban/priorities');
  // Deselected steps return to their project
  revalidatePath('/kanban/projects');
  redirect(BOARD_PATH);
}

export async function countIncompleteByTemplateAction(
  planId: string,
  templateIds: string[],
): Promise<Record<string, number>> {
  const userId = await getCurrentUserId();
  return countIncompleteInstancesByTemplateId(userId, planId, templateIds);
}
