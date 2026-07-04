"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { updateTaskQuadrantSchema, trackTaskSchema } from "../schemas";
import { fetchPriorityMatrix, trackTaskThisWeek } from "../services/matrixService";
import { updateTaskQuadrant } from "@/lib/db/tasks";
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
