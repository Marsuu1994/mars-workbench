"use server";

import { revalidatePath } from "next/cache";
import { updateTaskStatusSchema } from "../schemas";
import { updateTaskStatus } from "@/lib/db/tasks";

export async function updateTaskStatusAction(taskId: string, input: unknown) {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const task = await updateTaskStatus(taskId, parsed.data.status);

  revalidatePath("/kanban");
  return { data: task };
}
