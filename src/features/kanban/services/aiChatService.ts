import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import prisma from "@/lib/prisma";
import { getPlanTemplateStats, getNonDoneAdhocTasks, type PlanTemplateStatRow } from "@/lib/db/tasks";
import { getTaskTemplateTitlesByIds, getTaskTemplates } from "@/lib/db/taskTemplates";
import { getPlanTemplatesByPlanId } from "@/lib/db/planTemplates";
import { getActivePlan, getPlanByStatus, type PlanItem } from "@/lib/db/plans";
import { createChat, getChatById, updateChatPlanId, updateChatMetadata } from "@/lib/db/chats";
import { createMessage, getMessagesByChatId } from "@/lib/db/messages";
import { MessageType, PlanMode, PlanStatus, TaskType } from "@/generated/prisma/client";
import { openai, DRAFT_PLAN_MODEL } from "@/lib/llm/openai";
import { createPlanFromDraft } from "./planService";
import { draftPlanResponseSchema, type DraftPlanResponse } from "../schemas";
import { buildDraftPlanSystemPrompt } from "../prompt/draftPlanPrompt";
import { getTodayDate, getISOWeekKey } from "../utils/dateUtils";
import type { ChatMetadata, LastPlanStats, OverallStats, PerTemplateStat } from "../types/aiChat";
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
 * template titles and the plan's per-week `frequency` onto the raw aggregate
 * rows so the snapshot is self-contained (draft generation needs no re-query).
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
  const planTemplates = await getPlanTemplatesByPlanId(planId);
  const frequencyByTemplate = new Map(
    planTemplates.map((pt) => [pt.templateId, pt.frequency])
  );

  const perTemplate: PerTemplateStat[] = rows.map((r) => ({
    ...r,
    title: titles.get(r.templateId) ?? "Untitled task",
    frequency: frequencyByTemplate.get(r.templateId) ?? 1,
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

/**
 * Generate (or revise) a draft plan via the LLM. Persists the user's message,
 * replays the full conversation (prior DRAFT_PLAN turns included verbatim) into
 * a static system prompt, calls the model for structured output, and stores the
 * result as a DRAFT_PLAN message — which is itself the pending-approval draft.
 */
export async function generateDraftPlan(
  userId: string,
  chatId: string,
  userMessage: string
): Promise<DraftPlanResponse> {
  const chat = await getChatById(userId, chatId);
  if (!chat) throw new Error("Chat not found");

  // Persist the user turn first so it survives an LLM failure and is part of the
  // history we replay below.
  await createMessage({ chatId, role: "user", content: userMessage });

  const metadata = (chat.metadata ?? {}) as unknown as ChatMetadata;
  const lastWeekStats = metadata.lastPlanStats?.perTemplate ?? null;

  const templates = await getTaskTemplates(userId);
  const existingTemplates = templates.map((t) => ({
    templateId: t.id,
    title: t.title,
    description: t.description,
    size: t.size,
  }));

  const system = buildDraftPlanSystemPrompt({ existingTemplates, lastWeekStats });

  // DRAFT_PLAN messages already store the full JSON in `content`, so replaying
  // content verbatim shows the model its prior drafts; TEXT turns pass through.
  const messages = await getMessagesByChatId(chatId);
  const history: ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const completion = await openai.chat.completions.parse({
    model: DRAFT_PLAN_MODEL,
    messages: [{ role: "system", content: system }, ...history],
    response_format: zodResponseFormat(draftPlanResponseSchema, "draft_plan"),
  });

  const choice = completion.choices[0]?.message;
  if (choice?.refusal) throw new Error(`LLM refused: ${choice.refusal}`);
  const parsed = choice?.parsed;
  if (!parsed) throw new Error("LLM returned no parsed draft plan");

  // Defensive: enforce the prompt's hard constraint server-side — a templateId
  // the model invented (not one of the user's own) is coerced to a NEW template.
  const ownedIds = new Set(existingTemplates.map((t) => t.templateId));
  const response: DraftPlanResponse = {
    ...parsed,
    draftTemplates: parsed.draftTemplates.map((d) =>
      d.templateId && !ownedIds.has(d.templateId) ? { ...d, templateId: null } : d
    ),
  };

  await createMessage({
    chatId,
    role: "assistant",
    content: JSON.stringify(response),
    type: MessageType.DRAFT_PLAN,
  });

  // Overwrite the single-slot approval clipboard (kept on the chat so approval
  // reads it off the already-loaded chat — no extra message query).
  await updateChatMetadata(chatId, {
    ...metadata,
    latestDraft: { description: response.description, draftTemplates: response.draftTemplates },
  });

  return response;
}

/**
 * Approve the latest draft: create the plan (commit-as-is). Reads the latest
 * DRAFT_PLAN message as the source of truth, then in ONE transaction creates a
 * TaskTemplate for each new (templateId === null) draft entry and the plan
 * itself (which also completes the prior PENDING_UPDATE plan). The pending
 * plan's non-done ad-hoc tasks are carried over to the new plan. Finally links
 * the chat to the new plan.
 */
export async function approveDraftPlan(userId: string, chatId: string): Promise<PlanItem> {
  const chat = await getChatById(userId, chatId);
  if (!chat) throw new Error("Chat not found");

  // Approval clipboard — read straight off the already-loaded chat.
  const metadata = (chat.metadata ?? {}) as unknown as ChatMetadata;
  const draft = metadata.latestDraft;
  if (!draft) throw new Error("No draft plan to approve");

  // Guards mirror createPlan: no active plan may exist; complete the pending one.
  const activePlan = await getActivePlan(userId);
  if (activePlan) throw new Error("An active plan already exists");
  const pendingPlan = await getPlanByStatus(userId, PlanStatus.PENDING_UPDATE);

  // Carry the pending plan's non-done ad-hoc tasks over to the new plan.
  let adhocTaskIds: string[] = [];
  if (pendingPlan) {
    const adhoc = await getNonDoneAdhocTasks(userId);
    adhocTaskIds = adhoc.filter((t) => t.planId === pendingPlan.id).map((t) => t.id);
  }

  const today = getTodayDate();
  const periodKey = getISOWeekKey(today);

  return prisma.$transaction(async (tx) => {
    const newPlan = await createPlanFromDraft(
      tx,
      userId,
      {
        draftTemplates: draft.draftTemplates,
        description: draft.description,
        mode: PlanMode.NORMAL,
        adhocTaskIds,
        pendingPlan,
      },
      periodKey,
      today
    );
    await updateChatPlanId(chatId, newPlan.id, tx);
    return newPlan;
  });
}
