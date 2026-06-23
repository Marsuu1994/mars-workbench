import prisma from "@/lib/prisma";
import { Prisma, PlanMode, PlanStatus, TaskSize, TaskType } from "@/generated/prisma/client";

export type PlanItem = {
  id: string;
  userId: string;
  periodType: string;
  periodKey: string;
  description: string | null;
  mode: PlanMode;
  status: PlanStatus;
  lastSyncDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlanWithTemplates = PlanItem & {
  planTemplates: {
    id: string;
    templateId: string;
    type: TaskType;
    frequency: number;
    template: {
      id: string;
      title: string;
      description: string;
      size: TaskSize;
      isArchived: boolean;
    };
  }[];
};

const planSelect = {
  id: true,
  userId: true,
  periodType: true,
  periodKey: true,
  description: true,
  mode: true,
  status: true,
  lastSyncDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Get the currently active plan for a user
 */
export async function getActivePlan(userId: string): Promise<PlanItem | null> {
  return prisma.plan.findFirst({
    where: { userId, status: "ACTIVE" },
    select: planSelect,
  });
}

/**
 * Get a user's plan by status
 */
export async function getPlanByStatus(
  userId: string,
  status: PlanStatus
): Promise<PlanItem | null> {
  return prisma.plan.findFirst({
    where: { userId, status },
    select: planSelect,
  });
}

/**
 * Get a user's plan with its linked templates.
 * Returns null when the plan does not exist or is not owned by the user, which
 * doubles as the ownership gate for plan reads/edits.
 */
export async function getPlanWithTemplates(
  userId: string,
  planId: string
): Promise<PlanWithTemplates | null> {
  return prisma.plan.findFirst({
    where: { id: planId, userId },
    select: {
      ...planSelect,
      planTemplates: {
        select: {
          id: true,
          templateId: true,
          type: true,
          frequency: true,
          template: {
            select: {
              id: true,
              title: true,
              description: true,
              size: true,
              isArchived: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Create a new plan with ACTIVE status
 */
export async function createPlan(
  userId: string,
  data: { periodType: "WEEKLY"; periodKey: string; description?: string; mode?: PlanMode },
  tx?: Prisma.TransactionClient
): Promise<PlanItem> {
  const db = tx ?? prisma;
  return db.plan.create({
    data: {
      userId,
      periodType: data.periodType,
      periodKey: data.periodKey,
      description: data.description,
      mode: data.mode,
      status: "ACTIVE",
    },
    select: planSelect,
  });
}

/**
 * Update a plan's fields, scoped to the owner.
 * Uses updateMany so the non-unique userId can be part of the filter; returns
 * the count so callers can treat 0 as not-found/forbidden.
 */
export async function updatePlan(
  userId: string,
  planId: string,
  data: { description?: string; mode?: PlanMode },
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.plan.updateMany({
    where: { id: planId, userId },
    data,
  });
}

/**
 * Transition a plan's status, scoped to the owner
 */
export async function updatePlanStatus(
  userId: string,
  planId: string,
  status: PlanStatus,
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.plan.updateMany({
    where: { id: planId, userId },
    data: { status },
  });
}

/**
 * Set the last sync date for a plan, scoped to the owner
 */
export async function updateLastSyncDate(
  userId: string,
  planId: string,
  date: Date,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  await db.plan.updateMany({
    where: { id: planId, userId },
    data: { lastSyncDate: date },
  });
}
