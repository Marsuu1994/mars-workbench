'use server';

import {revalidatePath} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {updateTaskStatusSchema, createAdhocTaskSchema} from '../schemas';
import {updateTaskStatus, createTask} from '@/lib/db/tasks';
import {TaskType, TaskStatus} from '@/generated/prisma/client';
import {sizeToPoints} from '../utils/sizeUtils';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';

export async function updateTaskStatusAction(taskId: string, input: unknown) {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const task = await updateTaskStatus(userId, taskId, parsed.data.status);
  if (!task) {
    const t = await getTranslations('Errors');
    return {error: {formErrors: [t('taskNotFound')], fieldErrors: {}}};
  }

  revalidatePath('/kanban');
  // Only AD_HOC tasks appear on the matrix (e.g. a tracked task marked DONE
  // disappears from it) — don't invalidate it for every board drag.
  if (task.type === TaskType.AD_HOC) {
    revalidatePath('/kanban/priorities');
  }
  return {data: task};
}

/**
 * Add Priority Task flow: creates an unassigned matrix task (planId = null,
 * status = BACKLOG) in the given quadrant. Tasks reach the board only via
 * the Track This Week flow (trackTaskAction).
 */
export async function createAdhocTaskAction(input: unknown) {
  const parsed = createAdhocTaskSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const task = await createTask(userId, {
    planId: null,
    type: TaskType.AD_HOC,
    title: parsed.data.title,
    description: parsed.data.description,
    size: parsed.data.size,
    points: sizeToPoints(parsed.data.size),
    status: TaskStatus.BACKLOG,
    quadrant: parsed.data.quadrant,
    instanceIndex: 1,
  });

  revalidatePath('/kanban/priorities');
  return {data: task};
}
