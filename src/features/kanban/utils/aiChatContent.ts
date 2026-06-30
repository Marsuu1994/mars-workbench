/**
 * Static quick-start chip keys (i18n keys under the `AiChat` namespace) shown
 * under the welcome message. Hardcoded (not LLM-generated) so the modal renders
 * instantly. The set swaps on whether a prior plan's stats exist. Resolve to
 * copy via a translator at the call site — `getTranslations` on the server,
 * `useTranslations` on the client. The welcome text itself is built from
 * `AiChat.welcomeNew` / `AiChat.welcomeReturning` at those call sites.
 */
export const NEW_USER_CHIP_KEYS = [
  "chipNewInterviews",
  "chipNewFitness",
  "chipNewSkill",
] as const;

export const RETURNING_USER_CHIP_KEYS = [
  "chipReturningKeep",
  "chipReturningAdjust",
  "chipReturningTry",
] as const;
