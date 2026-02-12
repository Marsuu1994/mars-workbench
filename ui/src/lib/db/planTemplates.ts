import prisma from "@/lib/prisma";

export type PlanTemplateItem = {
  id: string;
  planId: string;
  templateId: string;
  createdAt: Date;
};

const planTemplateSelect = {
  id: true,
  planId: true,
  templateId: true,
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
 * Link a template to a plan
 */
export async function createPlanTemplate(
  planId: string,
  templateId: string
): Promise<PlanTemplateItem> {
  return prisma.planTemplate.create({
    data: { planId, templateId },
    select: planTemplateSelect,
  });
}

/**
 * Bulk delete all plan-template links for a plan (used for plan rebuild)
 */
export async function deletePlanTemplatesByPlanId(planId: string): Promise<void> {
  await prisma.planTemplate.deleteMany({
    where: { planId },
  });
}
