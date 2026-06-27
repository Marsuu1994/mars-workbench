import type { LastPlanStats } from "../types/aiChat";

/**
 * Static quick-start chips shown under the welcome message. Hardcoded (not
 * LLM-generated) so the modal renders instantly. The set swaps on whether a
 * prior plan's stats exist.
 */
export const NEW_USER_CHIPS = [
  "I'm preparing for tech interviews",
  "Help me build a fitness routine",
  "I want to learn a new skill",
] as const;

export const RETURNING_USER_CHIPS = [
  "Keep the same plan",
  "Adjust difficulty",
  "Try something new",
] as const;

const NEW_USER_WELCOME =
  "Hi! I'm your planning assistant. Tell me what you'd like to focus on this " +
  "period and I'll draft a plan of daily and weekly tasks for you. You can " +
  "refine it together before adding anything to your board.";

/**
 * Build the first assistant message. Returning users (stats present) get their
 * previous period interpolated into the copy; new users get fixed onboarding
 * text. Purely static — no LLM call.
 */
export function buildWelcomeMessage(stats?: LastPlanStats): string {
  if (!stats) return NEW_USER_WELCOME;

  const { completedCount, totalCount, completionRate, totalPoints, dailyCompletionRate } =
    stats.overall;
  const completionPct = Math.round(completionRate * 100);
  const dailyPct = Math.round(dailyCompletionRate * 100);

  return (
    `Welcome back! Last period you completed ${completedCount} of ${totalCount} ` +
    `tasks (${completionPct}%) and earned ${totalPoints} points. Your daily ` +
    `habits hit ${dailyPct}%. Want to keep this plan, adjust the difficulty, or ` +
    `try something new?`
  );
}
