/**
 * Client-safe enum constants mirroring the Prisma schema.
 * Prisma's generated client cannot be imported in "use client" components
 * because it depends on Node-only modules.
 */

export const TaskType = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  AD_HOC: "AD_HOC",
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskStatus = {
  BACKLOG: "BACKLOG",
  TODO: "TODO",
  DOING: "DOING",
  DONE: "DONE",
  EXPIRED: "EXPIRED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const PeriodType = {
  WEEKLY: "WEEKLY",
} as const;
export type PeriodType = (typeof PeriodType)[keyof typeof PeriodType];

export const PlanMode = {
  NORMAL: "NORMAL",
  EXTREME: "EXTREME",
} as const;
export type PlanMode = (typeof PlanMode)[keyof typeof PlanMode];

export const TaskSize = {
  EXTRA_SMALL: "EXTRA_SMALL",
  SMALL: "SMALL",
  MEDIUM: "MEDIUM",
  LARGE: "LARGE",
  EXTRA_LARGE: "EXTRA_LARGE",
} as const;
export type TaskSize = (typeof TaskSize)[keyof typeof TaskSize];

export const SIZE_TO_POINTS: Record<TaskSize, number> = {
  EXTRA_SMALL: 1,
  SMALL: 2,
  MEDIUM: 3,
  LARGE: 5,
  EXTRA_LARGE: 8,
};

export const sizeToPoints = (size: TaskSize): number => SIZE_TO_POINTS[size];

// Size display labels (XS/S/M/L/XL) and effort copy now live in i18n
// (`Enums.TaskSize`, and `Enums.sizeEffort` with the points value passed as
// `hours`) — render them via useTranslations.

export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const MessageType = {
  TEXT: "TEXT",
  DRAFT_PLAN: "DRAFT_PLAN",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
