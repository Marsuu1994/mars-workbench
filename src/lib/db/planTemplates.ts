import prisma from "@/lib/prisma";
import { Prisma, TaskType } from "@/generated/prisma/client";

export type PlanTemplateItem = {
  id: string;
  planId: string;
  templateId: string;
  type: TaskType;
  frequency: number;
  createdAt: Date;
};

const planTemplateSelect = {
  id: true,
  planId: true,
  templateId: true,
  type: true,
  frequency: true,
  createdAt: true,
} as const;

/**
 * Get all plan-template links for a plan
 */
export async function getPlanTemplatesByPlanId(planId: string): Promise<PlanTemplateItem[]> {
  return prisma.planTemplate.findMany({
    where: { planId },
    select: planTemplateSelect,
  });
}

/**
 * Bulk link multiple templates to a plan with their per-plan type and frequency
 */
export async function createManyPlanTemplates(
  planId: string,
  templates: { templateId: string; type: TaskType; frequency: number }[],
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.planTemplate.createMany({
    data: templates.map(({ templateId, type, frequency }) => ({
      planId,
      templateId,
      type,
      frequency,
    })),
    skipDuplicates: true,
  });
}

/**
 * Update the type and frequency of an existing plan-template link
 */
export async function updatePlanTemplate(
  id: string,
  data: { type: TaskType; frequency: number },
  tx?: Prisma.TransactionClient
): Promise<PlanTemplateItem> {
  const db = tx ?? prisma;
  return db.planTemplate.update({
    where: { id },
    data,
    select: planTemplateSelect,
  });
}

/**
 * Bulk delete all plan-template links for a plan (used for plan rebuild)
 */
export async function deletePlanTemplatesByPlanId(
  planId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  await db.planTemplate.deleteMany({
    where: { planId },
  });
}
