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

export const SIZE_LABELS: Record<TaskSize, string> = {
  EXTRA_SMALL: "XS",
  SMALL: "S",
  MEDIUM: "M",
  LARGE: "L",
  EXTRA_LARGE: "XL",
};

export const SIZE_EFFORT: Record<TaskSize, string> = {
  EXTRA_SMALL: "~1 hour of effort",
  SMALL: "~2 hours of effort",
  MEDIUM: "~3 hours of effort",
  LARGE: "~5 hours of effort",
  EXTRA_LARGE: "~8 hours of effort",
};

export const sizeToPoints = (size: TaskSize): number => SIZE_TO_POINTS[size];
export const sizeToLabel = (size: TaskSize): string => SIZE_LABELS[size];

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
