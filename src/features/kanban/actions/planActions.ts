"use server";

import { revalidatePath } from "next/cache";
import { createPlanSchema, updatePlanSchema } from "../schemas";
import { createPlan, updatePlan } from "../services/planService";
import { countIncompleteTasksByTemplateId } from "@/lib/db/tasks";

export async function createPlanAction(input: unknown) {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const result = await createPlan(parsed.data);
  if ("error" in result) return result;

  revalidatePath("/kanban");
  return { data: result };
}

export async function updatePlanAction(planId: string, input: unknown) {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  await updatePlan(planId, parsed.data);

  revalidatePath("/kanban");
  return { data: { success: true } };
}

export async function countIncompleteByTemplateAction(
  planId: string,
  templateIds: string[]
): Promise<Record<string, number>> {
  const map = await countIncompleteTasksByTemplateId(planId, templateIds);
  return Object.fromEntries(map);
}

