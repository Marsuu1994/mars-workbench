import prisma from "@/lib/prisma";
import { Prisma, PlanStatus, TaskType } from "@/generated/prisma/client";

export type PlanItem = {
  id: string;
  userId: string | null;
  periodType: string;
  periodKey: string;
  description: string | null;
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
      points: number;
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
  status: true,
  lastSyncDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Get the currently active plan
 */
export async function getActivePlan(): Promise<PlanItem | null> {
  return prisma.plan.findFirst({
    where: { status: "ACTIVE" },
    select: planSelect,
  });
}

/**
 * Get a plan by status
 */
export async function getPlanByStatus(status: PlanStatus): Promise<PlanItem | null> {
  return prisma.plan.findFirst({
    where: { status },
    select: planSelect,
  });
}

/**
 * Get a plan with its linked templates
 */
export async function getPlanWithTemplates(planId: string): Promise<PlanWithTemplates | null> {
  return prisma.plan.findUnique({
    where: { id: planId },
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
              points: true,
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
  data: { periodType: "WEEKLY"; periodKey: string; description?: string },
  tx?: Prisma.TransactionClient
): Promise<PlanItem> {
  const db = tx ?? prisma;
  return db.plan.create({
    data: {
      periodType: data.periodType,
      periodKey: data.periodKey,
      description: data.description,
      status: "ACTIVE",
    },
    select: planSelect,
  });
}

/**
 * Update a plan's description
 */
export async function updatePlan(
  planId: string,
  data: { description?: string },
  tx?: Prisma.TransactionClient
): Promise<PlanItem> {
  const db = tx ?? prisma;
  return db.plan.update({
    where: { id: planId },
    data,
    select: planSelect,
  });
}

/**
 * Transition a plan's status
 */
export async function updatePlanStatus(
  planId: string,
  status: PlanStatus,
  tx?: Prisma.TransactionClient
): Promise<PlanItem> {
  const db = tx ?? prisma;
  return db.plan.update({
    where: { id: planId },
    data: { status },
    select: planSelect,
  });
}

/**
 * Set the last sync date for a plan
 */
export async function updateLastSyncDate(
  planId: string,
  date: Date,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  await db.plan.update({
    where: { id: planId },
    data: { lastSyncDate: date },
  });
}
