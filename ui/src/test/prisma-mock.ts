/**
 * Mock of the generated Prisma client enums.
 * The real generated client is gitignored and requires `npx prisma generate`,
 * which needs a running database. This mock provides the enum values so that
 * modules importing from `@/generated/prisma/client` can be tested without
 * Prisma generation.
 *
 * Uses TypeScript enums (not `as const` objects) to match the Prisma client
 * output, which is required for `z.nativeEnum()` to work correctly.
 */

export enum PeriodType {
  WEEKLY = "WEEKLY",
}

export enum TaskType {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  AD_HOC = "AD_HOC",
}

export enum TaskStatus {
  TODO = "TODO",
  DOING = "DOING",
  DONE = "DONE",
  EXPIRED = "EXPIRED",
}

export enum MessageRole {
  user = "user",
  assistant = "assistant",
  system = "system",
}

export enum PlanStatus {
  ACTIVE = "ACTIVE",
  PENDING_UPDATE = "PENDING_UPDATE",
  COMPLETED = "COMPLETED",
}
