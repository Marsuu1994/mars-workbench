'use server';

import {revalidatePath} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {createPlanSchema, updatePlanSchema} from '@/schemas';
import {
  createPlan,
  updatePlan,
  TemplateNotFoundError,
} from '../services/planService';
import {countIncompleteTasksByTemplateId} from '@/lib/db/tasks';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';

/** A submitted template the user does not own (stale form or tampered id). */
const templateNotFoundMessage = async () => {
  const t = await getTranslations('Errors');
  return t('templateNotFound');
};

export async function createPlanAction(input: unknown) {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  try {
    const result = await createPlan(userId, parsed.data);
    if ('error' in result) return result;

    revalidatePath('/kanban');
    // Deselected ad-hoc tasks return to the matrix; carried ones become tracked
    revalidatePath('/kanban/priorities');
    return {data: result};
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return {
        error: {formErrors: [await templateNotFoundMessage()], fieldErrors: {}},
      };
    }
    throw error;
  }
}

export async function updatePlanAction(planId: string, input: unknown) {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  try {
    const result = await updatePlan(userId, planId, parsed.data);
    if ('error' in result) return result;

    revalidatePath('/kanban');
    // Deselected ad-hoc tasks return to the matrix; newly linked ones become tracked
    revalidatePath('/kanban/priorities');
    return {data: {success: true}};
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return {
        error: {formErrors: [await templateNotFoundMessage()], fieldErrors: {}},
      };
    }
    throw error;
  }
}

export async function countIncompleteByTemplateAction(
  planId: string,
  templateIds: string[],
): Promise<Record<string, number>> {
  const userId = await getCurrentUserId();
  const map = await countIncompleteTasksByTemplateId(
    userId,
    planId,
    templateIds,
  );
  return Object.fromEntries(map);
}
