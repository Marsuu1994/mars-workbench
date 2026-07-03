"use server";

import { revalidatePath } from "next/cache";
import { createPlanSchema, updatePlanSchema } from "@/lib/kanban/schemas";
import { createPlan, updatePlan } from "../services/planService";
import { countIncompleteTasksByTemplateId } from "@/lib/db/tasks";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export async function createPlanAction(input: unknown) {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const result = await createPlan(userId, parsed.data);
  if ("error" in result) return result;

  revalidatePath("/kanban");
  // Deselected ad-hoc tasks return to the matrix; carried ones become tracked
  revalidatePath("/kanban/priorities");
  return { data: result };
}

export async function updatePlanAction(planId: string, input: unknown) {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const result = await updatePlan(userId, planId, parsed.data);
  if (result?.error) return result;

  revalidatePath("/kanban");
  // Deselected ad-hoc tasks return to the matrix; newly linked ones become tracked
  revalidatePath("/kanban/priorities");
  return { data: { success: true } };
}

export async function countIncompleteByTemplateAction(
  planId: string,
  templateIds: string[]
): Promise<Record<string, number>> {
  const userId = await getCurrentUserId();
  const map = await countIncompleteTasksByTemplateId(userId, planId, templateIds);
  return Object.fromEntries(map);
}

