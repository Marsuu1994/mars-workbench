import { getPlanTemplateStats, type PlanTemplateStatRow } from "@/lib/db/tasks";
import { getTaskTemplateTitlesByIds } from "@/lib/db/taskTemplates";
import { createChat } from "@/lib/db/chats";
import { createMessage } from "@/lib/db/messages";
import { TaskType } from "@/generated/prisma/client";
import type { LastPlanStats, OverallStats, PerTemplateStat } from "../types/aiChat";
import {
  NEW_USER_CHIPS,
  RETURNING_USER_CHIPS,
  buildWelcomeMessage,
} from "../utils/aiChatContent";

const AI_CHAT_TITLE = "Plan Assistant";

/**
 * Roll per-template rows up into overall aggregates. Daily completion rate is
 * computed over DAILY templates only (habit signal).
 */
function rollUpOverall(perTemplate: PerTemplateStat[]): OverallStats {
  let completedCount = 0;
  let totalCount = 0;
  let totalPoints = 0;
  let dailyCompleted = 0;
  let dailyTotal = 0;

  for (const t of perTemplate) {
    completedCount += t.completed;
    totalCount += t.total;
    totalPoints += t.pointsEarned;
    if (t.type === TaskType.DAILY) {
      dailyCompleted += t.completed;
      dailyTotal += t.total;
    }
  }

  return {
    completedCount,
    totalCount,
    totalPoints,
    completionRate: totalCount > 0 ? completedCount / totalCount : 0,
    dailyCompletionRate: dailyTotal > 0 ? dailyCompleted / dailyTotal : 0,
  };
}

/**
 * Per-template performance + rolled-up overall for a finished plan. Joins
 * template titles onto the raw aggregate rows.
 */
export async function getTemplateStats(
  userId: string,
  planId: string
): Promise<LastPlanStats> {
  const rows: PlanTemplateStatRow[] = await getPlanTemplateStats(userId, planId);
  const titles = await getTaskTemplateTitlesByIds(
    userId,
    rows.map((r) => r.templateId)
  );

  const perTemplate: PerTemplateStat[] = rows.map((r) => ({
    ...r,
    title: titles.get(r.templateId) ?? "Untitled task",
  }));

  return { overall: rollUpOverall(perTemplate), perTemplate };
}

/**
 * Bootstrap an AI plan-creation chat: snapshot stats into metadata and write a
 * static (no-LLM) welcome message. Returns the new chat id, the welcome text,
 * and the suggestion chips appropriate for new vs returning users.
 */
export async function createAiChat(
  userId: string,
  planId?: string
): Promise<{ chatId: string; message: string; suggestionChips: readonly string[] }> {
  const stats = planId ? await getTemplateStats(userId, planId) : undefined;

  const chat = await createChat({
    userId,
    planId,
    title: AI_CHAT_TITLE,
    metadata: stats ? { lastPlanStats: stats } : {},
  });

  const message = buildWelcomeMessage(stats);
  await createMessage({ chatId: chat.id, role: "assistant", content: message });

  return {
    chatId: chat.id,
    message,
    suggestionChips: stats ? RETURNING_USER_CHIPS : NEW_USER_CHIPS,
  };
}
