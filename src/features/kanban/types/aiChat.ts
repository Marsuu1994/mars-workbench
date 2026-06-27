import type { TaskSize, TaskType } from "@/generated/prisma/client";

/**
 * Rolled-up stats across all templates of a finished plan. Consumed by the
 * static welcome message (returning users).
 */
export type OverallStats = {
  completionRate: number;
  completedCount: number;
  totalCount: number;
  totalPoints: number;
  dailyCompletionRate: number;
};

/**
 * Per-template performance for a finished plan. `expired` distinguishes
 * abandoned templates from in-progress ones — signal for the LLM to keep,
 * ease, or drop a template.
 */
export type PerTemplateStat = {
  templateId: string;
  title: string;
  type: TaskType;
  frequency: number; // last plan's per-week config for this template
  completed: number;
  expired: number;
  total: number;
  completionRate: number;
  pointsEarned: number;
};

/**
 * Snapshot persisted in Chat.metadata.lastPlanStats at chat creation. Reused by
 * the welcome message (overall) and every draft-generation prompt (perTemplate).
 */
export type LastPlanStats = {
  overall: OverallStats;
  perTemplate: PerTemplateStat[];
};

/**
 * A proposed template in an AI draft plan. `templateId` is null for brand-new
 * templates (created on approval) or a real id when reusing an existing one.
 * This is the persisted shape inside a DRAFT_PLAN message's content (the
 * approval source of truth); the LLM output schema lives in `schemas.ts`.
 */
export type DraftTemplate = {
  templateId: string | null;
  title: string;
  description: string;
  type: TaskType;
  frequency: number;
  size: TaskSize;
};

/**
 * Shape of Chat.metadata for AI plan-creation chats.
 * - `lastPlanStats`: snapshot captured at chat creation.
 * - `latestDraft`: the most recent draft, overwritten each generation — the
 *   single-slot approval clipboard (read directly off the already-loaded chat,
 *   so approval needs no extra message query). The full draft is also persisted
 *   as a DRAFT_PLAN message for chat history/rendering.
 */
export type ChatMetadata = {
  lastPlanStats?: LastPlanStats;
  latestDraft?: { description: string; draftTemplates: DraftTemplate[] };
};
