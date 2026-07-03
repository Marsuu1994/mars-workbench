"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  updateTaskQuadrantSchema,
  trackTaskSchema,
  createAdhocTaskSchema,
} from "@/lib/kanban/schemas";
import { fetchPriorityMatrix, trackTaskThisWeek } from "../services/matrixService";
import { updateTaskQuadrant, createTask } from "@/lib/db/tasks";
import { TaskType, TaskStatus } from "@/generated/prisma/client";
import { sizeToPoints } from "@/lib/kanban/sizeUtils";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export async function fetchPriorityMatrixAction() {
  const userId = await getCurrentUserId();
  return fetchPriorityMatrix(userId);
}

export async function updateTaskQuadrantAction(taskId: string, input: unknown) {
  const parsed = updateTaskQuadrantSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const task = await updateTaskQuadrant(userId, taskId, parsed.data.quadrant);
  if (!task) {
    const t = await getTranslations("Errors");
    return { error: { formErrors: [t("taskNotFound")], fieldErrors: {} } };
  }

  revalidatePath("/kanban/priorities");
  return { data: task };
}

export async function trackTaskAction(taskId: string, input: unknown) {
  const parsed = trackTaskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const result = await trackTaskThisWeek(userId, taskId, parsed.data.status);
  if ("error" in result) {
    const t = await getTranslations("Errors");
    return { error: { formErrors: [t(result.error)], fieldErrors: {} } };
  }

  revalidatePath("/kanban");
  revalidatePath("/kanban/priorities");
  return { data: result.task };
}

/**
 * Add Priority Task flow: creates an unassigned matrix task (planId = null,
 * status = BACKLOG) in the given quadrant. Tasks reach the board only via
 * the Track This Week flow (trackTaskAction).
 */
export async function createAdhocTaskAction(input: unknown) {
  const parsed = createAdhocTaskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

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

  revalidatePath("/kanban/priorities");
  return { data: task };
}
