import type { TaskType } from "@/generated/prisma/client";

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
