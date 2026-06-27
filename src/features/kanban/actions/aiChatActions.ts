"use server";

import {
  createAiChatSchema,
  generateDraftPlanSchema,
  getTemplateStatsSchema,
} from "../schemas";
import {
  createAiChat,
  generateDraftPlan,
  getTemplateStats,
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

export async function generateDraftPlanAction(input: unknown) {
  const parsed = generateDraftPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const userId = await getCurrentUserId();
  try {
    const data = await generateDraftPlan(userId, parsed.data.chatId, parsed.data.message);
    return { data };
  } catch {
    return {
      error: {
        formErrors: ["Couldn't generate a plan, please try again."],
        fieldErrors: {},
      },
    };
  }
}
