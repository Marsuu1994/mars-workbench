import type { MessageRole, MessageType, TaskSize, TaskType } from "@/generated/prisma/client";
import type { DraftPlanResponse } from "../schemas";

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

/**
 * Client-side message model for the AI chat modal — purely a rendering concern
 * (the LLM history is rebuilt server-side from DB rows, independent of this).
 * Four `type`s:
 * - `user`        — the user's typed turn
 * - `welcome`     — static first greeting, no LLM; carries quick-start `chips`
 * - `text`        — an LLM text reply (e.g. a clarifying question, no draft)
 * - `draft`       — an LLM draft plan; flagged `approved` once committed
 */
export type UiMessage =
  | { id: string; role: "user"; type: "user"; text: string }
  | { id: string; role: "assistant"; type: "welcome"; text: string; chips?: string[] }
  | { id: string; role: "assistant"; type: "text"; text: string }
  | {
      id: string;
      role: "assistant";
      type: "draft";
      draft: DraftPlanResponse;
      approved?: boolean;
    };

/** A persisted message row, trimmed to what the client needs to rehydrate. */
export type ActiveChatMessage = {
  role: MessageRole;
  type: MessageType;
  content: string;
};

/**
 * Snapshot of the user's resumable (unapproved) chat, returned by
 * `getActiveAiChatAction` so the client can rebuild the conversation. Null when
 * there is no in-progress chat. The approvable `latestDraft` is derived
 * client-side from the last DRAFT_PLAN message, so it is not sent separately.
 * `pendingGeneration` is true when the last turn is an unanswered user message
 * (a generation that was interrupted).
 */
export type ActiveChatPayload = {
  chatId: string;
  messages: ActiveChatMessage[];
  hasStats: boolean;
  pendingGeneration: boolean;
};
