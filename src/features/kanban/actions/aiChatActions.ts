"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  approveDraftPlanSchema,
  createAiChatSchema,
  generateDraftPlanSchema,
  getTemplateStatsSchema,
  resumeDraftPlanSchema,
} from "../schemas";
import {
  approveDraftPlan,
  createAiChat,
  generateDraftPlan,
  getActiveAiChat,
  getTemplateStats,
  resumeDraftPlan,
} from "../services/aiChatService";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export async function getTemplateStatsAction(input: unknown) {
  const parsed = getTemplateStatsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const data = await getTemplateStats(userId, parsed.data.planId);
  return { data };
}

export async function createAiChatAction(input: unknown) {
  const parsed = createAiChatSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  const data = await createAiChat(userId, parsed.data.planId);
  return { data };
}

export async function getActiveAiChatAction() {
  const userId = await getCurrentUserId();
  const data = await getActiveAiChat(userId);
  return { data };
}

export async function generateDraftPlanAction(input: unknown) {
  const parsed = generateDraftPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  try {
    const data = await generateDraftPlan(userId, parsed.data.chatId, parsed.data.message);
    return { data };
  } catch {
    const t = await getTranslations("Errors");
    return {
      error: {
        formErrors: [t("generateFailed")],
        fieldErrors: {},
      },
    };
  }
}

export async function resumeDraftPlanAction(input: unknown) {
  const parsed = resumeDraftPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  try {
    const data = await resumeDraftPlan(userId, parsed.data.chatId);
    return { data };
  } catch {
    const t = await getTranslations("Errors");
    return {
      error: {
        formErrors: [t("generateFailed")],
        fieldErrors: {},
      },
    };
  }
}

export async function approveDraftPlanAction(input: unknown) {
  const parsed = approveDraftPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  try {
    const plan = await approveDraftPlan(userId, parsed.data.chatId);
    revalidatePath("/kanban");
    // Carried-over ad-hoc tasks become tracked on the matrix
    revalidatePath("/kanban/priorities");
    return { data: { planId: plan.id } };
  } catch {
    const t = await getTranslations("Errors");
    return {
      error: {
        formErrors: [t("createFailed")],
        fieldErrors: {},
      },
    };
  }
}
