"use server";

import { revalidatePath } from "next/cache";
import { updateTaskStatusSchema, createAdhocTaskSchema } from "../schemas";
import { updateTaskStatus, createTask } from "@/lib/db/tasks";
import { getActivePlan } from "@/lib/db/plans";
import { TaskType, TaskStatus } from "@/generated/prisma/client";
import { sizeToPoints } from "../utils/sizeUtils";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export async function updateTaskStatusAction(taskId: string, input: unknown) {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const task = await updateTaskStatus(userId, taskId, parsed.data.status);
  if (!task) {
    return { error: { formErrors: ["Task not found"], fieldErrors: {} } };
  }

  revalidatePath("/kanban");
  return { data: task };
}

export async function createAdhocTaskAction(input: unknown) {
  const parsed = createAdhocTaskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const activePlan = await getActivePlan(userId);
  if (!activePlan) {
    return { error: { formErrors: ["No active plan found"], fieldErrors: {} } };
  }

  const task = await createTask(userId, {
    planId: activePlan.id,
    type: TaskType.AD_HOC,
    title: parsed.data.title,
    description: parsed.data.description,
    size: parsed.data.size,
    points: sizeToPoints(parsed.data.size),
    status: parsed.data.status ?? TaskStatus.TODO,
    instanceIndex: 1,
  });

  revalidatePath("/kanban");
  return { data: task };
}
