import type { TaskSize } from "@/generated/prisma/client";
import type { PerTemplateStat } from "../types/aiChat";
import { DRAFT_PLAN_SYSTEM_PROMPT_BODY } from "./draftPlanPromptBody";

export type PromptExistingTemplate = {
  templateId: string;
  title: string;
  description: string;
  size: TaskSize;
};

// Projection of the snapshot fed to the model (drops pointsEarned; keeps the
// keep/ease/drop signals).
type PromptLastWeekStat = {
  templateId: string;
  title: string;
  type: string;
  frequency: number;
  completed: number;
  expired: number;
  total: number;
  completionRate: number;
};

function toLastWeekStat(s: PerTemplateStat): PromptLastWeekStat {
  return {
    templateId: s.templateId,
    title: s.title,
    type: s.type,
    frequency: s.frequency,
    completed: s.completed,
    expired: s.expired,
    total: s.total,
    completionRate: Math.round(s.completionRate * 100) / 100,
  };
}

/**
 * Build the static system prompt for draft-plan generation. The two interpolated
 * sections (existing templates, last-week stats) are snapshotted at chat creation
 * and stable for the whole session, so this prompt is constant across turns.
 * Prior drafts are NOT injected here — they reach the model through history.
 */
export function buildDraftPlanSystemPrompt(input: {
  existingTemplates: PromptExistingTemplate[];
  lastWeekStats: PerTemplateStat[] | null;
}): string {
  const existing = JSON.stringify(input.existingTemplates, null, 2);
  const lastWeek = input.lastWeekStats
    ? JSON.stringify(input.lastWeekStats.map(toLastWeekStat), null, 2)
    : '"no history — first plan"';

  return `${DRAFT_PLAN_SYSTEM_PROMPT_BODY}

# Your inputs

Existing templates:
${existing}

Last week:
${lastWeek}`;
}
