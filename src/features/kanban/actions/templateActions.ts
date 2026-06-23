"use server";

import { revalidatePath } from "next/cache";
import { createTemplateSchema, updateTemplateSchema } from "../schemas";
import {
  createTaskTemplate,
  updateTaskTemplate,
} from "@/lib/db/taskTemplates";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export async function createTaskTemplateAction(input: unknown) {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const template = await createTaskTemplate(userId, parsed.data);

  revalidatePath("/kanban");
  return { data: template };
}

export async function updateTaskTemplateAction(id: string, input: unknown) {
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const result = await updateTaskTemplate(userId, id, parsed.data);
  if (result.count === 0) {
    return { error: { formErrors: ["Template not found"], fieldErrors: {} } };
  }

  revalidatePath("/kanban");
  return { data: { success: true } };
}
