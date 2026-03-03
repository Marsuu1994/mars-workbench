import {
  getActivePlan,
  getPlanByStatus,
  createPlan as dalCreatePlan,
  updatePlan as dalUpdatePlan,
  updateLastSyncDate,
  updatePlanStatus,
} from "@/lib/db/plans";
import {
  createManyPlanTemplates,
  deletePlanTemplatesByPlanId,
  getPlanTemplatesByPlanId,
  updatePlanTemplate,
} from "@/lib/db/planTemplates";
import {
  createManyTasks,
  deleteIncompleteTasksByTemplateIds,
  updateTasksPlanId,
  unlinkAdhocTasksFromPlan,
} from "@/lib/db/tasks";
import { Prisma, PlanMode, TaskType, TaskStatus, PlanStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getTodayDate, getISOWeekKey, isWeekend } from "../utils/dateUtils";
import type { PlanItem } from "@/lib/db/plans";
import type { z } from "zod";
import type { createPlanSchema, updatePlanSchema } from "../schemas";

type CreatePlanData = z.infer<typeof createPlanSchema>;
type UpdatePlanData = z.infer<typeof updatePlanSchema>;

type PlanTemplateInput = {
  templateId: string;
  type: TaskType;
  frequency: number;
};

async function generateTasksForTemplates(
  planId: string,
  periodKey: string,
  templates: PlanTemplateInput[],
  today: Date,
  mode: PlanMode,
  tx?: Prisma.TransactionClient
) {
  const taskData: Parameters<typeof createManyTasks>[0] = [];

  for (const { templateId, type, frequency } of templates) {
    // We need the template's title, description, and points for the Task record.
    // Since templates are passed in-band from the caller (who already loaded them),
    // we do a minimal lookup here. This stays inside the transaction to keep it consistent.
    const db = tx ?? prisma;
    const template = await db.taskTemplate.findUnique({
      where: { id: templateId },
      select: { title: true, description: true, points: true },
    });
    if (!template) continue;

    switch (type) {
      case TaskType.WEEKLY:
        for (let i = 0; i < frequency; i++) {
          taskData.push({
            planId,
            templateId,
            type,
            title: template.title,
            description: template.description ?? undefined,
            points: template.points,
            status: TaskStatus.TODO,
            periodKey,
            instanceIndex: i,
          });
        }
        break;
      case TaskType.DAILY:
        if (mode === PlanMode.NORMAL && isWeekend(today)) break;
        for (let i = 0; i < frequency; i++) {
          taskData.push({
            planId,
            templateId,
            type,
            title: template.title,
            description: template.description ?? undefined,
            points: template.points,
            status: TaskStatus.TODO,
            forDate: today,
            instanceIndex: i,
          });
        }
        break;
      case TaskType.AD_HOC:
        // AD_HOC tasks are created on-demand, not auto-generated here
        break;
    }
  }

  if (taskData.length > 0) {
    await createManyTasks(taskData, tx);
  }
}

export async function createPlan(
  data: CreatePlanData
): Promise<PlanItem | { error: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  const { periodType, description, mode, templates, adhocTaskIds } = data;

  // Guard reads — before transaction to keep connection hold time short
  const existing = await getActivePlan();
  if (existing) {
    return { error: { formErrors: ["An active plan already exists"], fieldErrors: {} } };
  }
  const pendingPlan = await getPlanByStatus(PlanStatus.PENDING_UPDATE);

  const today = getTodayDate();
  const periodKey = getISOWeekKey(today);

  const plan = await prisma.$transaction(async (tx) => {
    const newPlan = await dalCreatePlan({ periodType, periodKey, description, mode }, tx);
    if (templates.length > 0) {
      await createManyPlanTemplates(newPlan.id, templates, tx);
      await generateTasksForTemplates(newPlan.id, newPlan.periodKey, templates, today, mode, tx);
    }
    // Link selected ad-hoc tasks to new plan
    if (adhocTaskIds && adhocTaskIds.length > 0) {
      await updateTasksPlanId(adhocTaskIds, newPlan.id, tx);
    }
    // Unlink deselected ad-hoc tasks from pending plan
    if (pendingPlan) {
      await unlinkAdhocTasksFromPlan(pendingPlan.id, adhocTaskIds ?? [], tx);
      await updatePlanStatus(pendingPlan.id, PlanStatus.COMPLETED, tx);
    }
    await updateLastSyncDate(newPlan.id, today, tx);
    return newPlan;
  });

  return plan;
}

export async function updatePlan(planId: string, data: UpdatePlanData): Promise<void> {
  const { description, mode, templates, adhocTaskIds } = data;

  const hasTemplateChanges = templates !== undefined;
  const hasAdhocChanges = adhocTaskIds !== undefined;
  const hasDescriptionChange = description !== undefined;
  const hasModeChange = mode !== undefined;

  if (hasTemplateChanges || hasAdhocChanges) {
    // Read current PlanTemplate records before transaction — diff doesn't need transactional isolation
    const currentLinks = hasTemplateChanges
      ? await getPlanTemplatesByPlanId(planId)
      : [];
    const currentMap = new Map(currentLinks.map((l) => [l.templateId, l]));
    const newMap = hasTemplateChanges
      ? new Map(templates.map((t) => [t.templateId, t]))
      : new Map<string, PlanTemplateInput>();

    const addedTemplates = hasTemplateChanges
      ? templates.filter((t) => !currentMap.has(t.templateId))
      : [];
    const removedIds = hasTemplateChanges
      ? currentLinks
          .filter((l) => !newMap.has(l.templateId))
          .map((l) => l.templateId)
      : [];
    const modifiedTemplates = hasTemplateChanges
      ? templates.filter((t) => {
          const current = currentMap.get(t.templateId);
          return current && (current.type !== t.type || current.frequency !== t.frequency);
        })
      : [];

    const today = getTodayDate();
    const periodKey = getISOWeekKey(today);

    // Resolve effective mode: use new mode if changed, otherwise fetch current plan mode
    let effectiveMode = mode;
    if (effectiveMode === undefined) {
      const currentPlan = await getActivePlan();
      effectiveMode = currentPlan?.mode ?? PlanMode.NORMAL;
    }

    await prisma.$transaction(async (tx) => {
      // Template changes
      if (hasTemplateChanges) {
        // Removed: delete TODO/DOING tasks + remove PlanTemplate links
        if (removedIds.length > 0) {
          await deleteIncompleteTasksByTemplateIds(planId, removedIds, tx);
          await tx.planTemplate.deleteMany({
            where: { planId, templateId: { in: removedIds } },
          });
        }

        // Modified: delete TODO/DOING tasks, update PlanTemplate, regenerate
        for (const t of modifiedTemplates) {
          await deleteIncompleteTasksByTemplateIds(planId, [t.templateId], tx);
          const link = currentMap.get(t.templateId)!;
          await updatePlanTemplate(link.id, { type: t.type, frequency: t.frequency }, tx);
        }
        if (modifiedTemplates.length > 0) {
          await generateTasksForTemplates(planId, periodKey, modifiedTemplates, today, effectiveMode, tx);
        }

        // Added: create PlanTemplate links + generate instances
        if (addedTemplates.length > 0) {
          await createManyPlanTemplates(planId, addedTemplates, tx);
          await generateTasksForTemplates(planId, periodKey, addedTemplates, today, effectiveMode, tx);
        }

        await updateLastSyncDate(planId, today, tx);
      }

      // Ad-hoc task changes: link new, unlink removed
      if (hasAdhocChanges) {
        if (adhocTaskIds.length > 0) {
          await updateTasksPlanId(adhocTaskIds, planId, tx);
        }
        await unlinkAdhocTasksFromPlan(planId, adhocTaskIds, tx);
      }

      if (hasDescriptionChange || hasModeChange) {
        await dalUpdatePlan(planId, {
          ...(hasDescriptionChange && { description }),
          ...(hasModeChange && { mode }),
        }, tx);
      }
    });
  } else if (hasDescriptionChange || hasModeChange) {
    // Description/mode-only update — single write, no transaction overhead needed
    await dalUpdatePlan(planId, {
      ...(hasDescriptionChange && { description }),
      ...(hasModeChange && { mode }),
    });
  }
}
