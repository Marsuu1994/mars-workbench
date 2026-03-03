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
