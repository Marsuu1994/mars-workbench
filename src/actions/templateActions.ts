'use server';

import {revalidatePath} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {createTemplateSchema, updateTemplateSchema} from '@/schemas';
import {createTemplate, updateTemplate} from '../services/planService';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import {BOARD_PATH} from '@/utils/planUtils';

export async function createTaskTemplateAction(input: unknown) {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const template = await createTemplate(userId, parsed.data);

  revalidatePath(BOARD_PATH);
  return {data: template};
}

export async function updateTaskTemplateAction(id: string, input: unknown) {
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await updateTemplate(userId, id, parsed.data);
  if ('error' in result) {
    const t = await getTranslations('Errors');
    return {error: {formErrors: [t(result.error)], fieldErrors: {}}};
  }

  revalidatePath(BOARD_PATH);
  return {data: result};
}
