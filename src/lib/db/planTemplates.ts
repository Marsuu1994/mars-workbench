import {prisma} from '@/lib/prisma';
import {Prisma, TaskSize, TaskType} from '@/generated/prisma/client';

export type PlanTemplateItem = {
  id: string;
  planId: string;
  templateId: string;
  type: TaskType;
  frequency: number;
  createdAt: Date;
};

/** A plan line as the board reads it: the template's size prices its days. */
export type BoardPlanTemplate = {
  templateId: string;
  type: TaskType;
  frequency: number;
  size: TaskSize;
};

/**
 * A plan's template lines with each template's size, for the board: one join,
 * where `getPlanWithTemplates`' nested select takes three queries.
 */
export async function getBoardPlanTemplatesByPlanId(
  userId: string,
  planId: string,
): Promise<BoardPlanTemplate[]> {
  return prisma.$queryRaw<BoardPlanTemplate[]>`
    SELECT
      plan_templates.template_id AS "templateId",
      plan_templates.type,
      plan_templates.frequency,
      task_templates.size
    FROM plan_templates
    JOIN plans ON plans.id = plan_templates.plan_id
    JOIN task_templates ON task_templates.id = plan_templates.template_id
    WHERE plan_templates.plan_id = ${planId}::uuid
      AND plans.user_id = ${userId}::uuid
    ORDER BY plan_templates.created_at, plan_templates.id
  `;
}

const planTemplateSelect = {
  id: true,
  planId: true,
  templateId: true,
  type: true,
  frequency: true,
  createdAt: true,
} as const;

/**
 * Bulk link multiple templates to a plan with their per-plan type and frequency
 */
export async function createManyPlanTemplates(
  planId: string,
  templates: {templateId: string; type: TaskType; frequency: number}[],
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.planTemplate.createMany({
    data: templates.map(({templateId, type, frequency}) => ({
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
  data: {type: TaskType; frequency: number},
  tx?: Prisma.TransactionClient,
): Promise<PlanTemplateItem> {
  const db = tx ?? prisma;
  return db.planTemplate.update({
    where: {id},
    data,
    select: planTemplateSelect,
  });
}
