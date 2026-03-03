"use server";

import { revalidatePath } from "next/cache";
import { createTemplateSchema, updateTemplateSchema } from "../schemas";
import {
  createTaskTemplate,
  updateTaskTemplate,
} from "@/lib/db/taskTemplates";

export async function createTaskTemplateAction(input: unknown) {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const template = await createTaskTemplate(parsed.data);

  revalidatePath("/kanban");
  return { data: template };
}

export async function updateTaskTemplateAction(id: string, input: unknown) {
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const template = await updateTaskTemplate(id, parsed.data);

  revalidatePath("/kanban");
  return { data: template };
}
