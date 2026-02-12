import prisma from "@/lib/prisma";
import { PlanStatus } from "@/generated/prisma/client";

export type PlanItem = {
  id: string;
  userId: string | null;
  periodType: string;
  periodKey: string;
  description: string | null;
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type PlanWithTemplates = PlanItem & {
  planTemplates: {
    id: string;
    templateId: string;
    template: {
      id: string;
      title: string;
      description: string;
      points: number;
      type: string;
      frequency: number;
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
          template: {
            select: {
              id: true,
              title: true,
              description: true,
              points: true,
              type: true,
              frequency: true,
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
export async function createPlan(data: {
  periodType: "WEEKLY";
  periodKey: string;
  description?: string;
}): Promise<PlanItem> {
  return prisma.plan.create({
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
  data: { description?: string }
): Promise<PlanItem> {
  return prisma.plan.update({
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
  status: PlanStatus
): Promise<PlanItem> {
  return prisma.plan.update({
    where: { id: planId },
    data: { status },
    select: planSelect,
  });
}
