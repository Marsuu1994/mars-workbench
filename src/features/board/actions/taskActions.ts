"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { updateTaskStatusSchema } from "@/lib/kanban/schemas";
import { updateTaskStatus } from "@/lib/db/tasks";
import { TaskType } from "@/generated/prisma/client";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export async function updateTaskStatusAction(taskId: string, input: unknown) {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const task = await updateTaskStatus(userId, taskId, parsed.data.status);
  if (!task) {
    const t = await getTranslations("Errors");
    return { error: { formErrors: [t("taskNotFound")], fieldErrors: {} } };
  }

  revalidatePath("/kanban");
  // Only AD_HOC tasks appear on the matrix (e.g. a tracked task marked DONE
  // disappears from it) — don't invalidate it for every board drag.
  if (task.type === TaskType.AD_HOC) {
    revalidatePath("/kanban/priorities");
  }
  return { data: task };
}
