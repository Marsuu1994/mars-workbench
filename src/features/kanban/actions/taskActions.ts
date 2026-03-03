"use server";

import { revalidatePath } from "next/cache";
import { updateTaskStatusSchema, createAdhocTaskSchema } from "../schemas";
import { updateTaskStatus, createTask } from "@/lib/db/tasks";
import { getActivePlan } from "@/lib/db/plans";
import { TaskType, TaskStatus } from "@/generated/prisma/client";

export async function updateTaskStatusAction(taskId: string, input: unknown) {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const task = await updateTaskStatus(taskId, parsed.data.status);

  revalidatePath("/kanban");
  return { data: task };
}

export async function createAdhocTaskAction(input: unknown) {
  const parsed = createAdhocTaskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const activePlan = await getActivePlan();
  if (!activePlan) {
    return { error: { formErrors: ["No active plan found"], fieldErrors: {} } };
  }

  const task = await createTask({
    planId: activePlan.id,
    type: TaskType.AD_HOC,
    title: parsed.data.title,
    description: parsed.data.description,
    points: parsed.data.points,
    status: parsed.data.status ?? TaskStatus.TODO,
    instanceIndex: 1,
  });

  revalidatePath("/kanban");
  return { data: task };
}
