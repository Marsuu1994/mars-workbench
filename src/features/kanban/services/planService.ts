import {
  getActivePlan,
  getPlanByStatus,
  getPlanWithTemplates,
  createPlan as dalCreatePlan,
  updatePlan as dalUpdatePlan,
  updateLastSyncDate,
  updatePlanStatus,
} from "@/lib/db/plans";
import {
  createManyPlanTemplates,
  updatePlanTemplate,
} from "@/lib/db/planTemplates";
import { createManyTaskTemplates } from "@/lib/db/taskTemplates";
import {
  createManyTasks,
  deleteIncompleteTasksByTemplateIds,
  updateTasksPlanId,
  unlinkAdhocTasksFromPlan,
} from "@/lib/db/tasks";
import { Prisma, PeriodType, PlanMode, TaskType, TaskStatus, PlanStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getTodayDate, getISOWeekKey, isWeekend } from "../utils/dateUtils";
import { sizeToPoints } from "../utils/sizeUtils";
import type { PlanItem } from "@/lib/db/plans";
import type { DraftTemplate } from "../types/aiChat";
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
  userId: string,
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
    // Scope the lookup to the user so a foreign templateId smuggled through the
    // form can't be used to generate tasks. This stays inside the transaction to
    // keep it consistent.
    const db = tx ?? prisma;
    const template = await db.taskTemplate.findFirst({
      where: { id: templateId, userId },
      select: { title: true, description: true, size: true },
    });
    if (!template) continue;

    switch (type) {
      case TaskType.WEEKLY:
        for (let i = 0; i < frequency; i++) {
          taskData.push({
            userId,
            planId,
            templateId,
            type,
            title: template.title,
            description: template.description ?? undefined,
            size: template.size,
            points: sizeToPoints(template.size),
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
            userId,
            planId,
            templateId,
            type,
            title: template.title,
            description: template.description ?? undefined,
            size: template.size,
            points: sizeToPoints(template.size),
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

/**
 * Core plan-creation steps, running inside a caller-provided transaction. Lets
 * other flows (e.g. AI draft approval, which first creates new TaskTemplates)
 * compose plan creation into one atomic transaction. Guard reads (active plan,
 * pending plan) are the caller's responsibility.
 */
export async function createPlanInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  params: {
    periodType: PeriodType;
    periodKey: string;
    description?: string;
    mode: PlanMode;
    templates: PlanTemplateInput[];
    adhocTaskIds?: string[];
    pendingPlan: PlanItem | null;
  },
  today: Date
): Promise<PlanItem> {
  const { periodType, periodKey, description, mode, templates, adhocTaskIds, pendingPlan } = params;

  const newPlan = await dalCreatePlan(userId, { periodType, periodKey, description, mode }, tx);
  if (templates.length > 0) {
    await createManyPlanTemplates(newPlan.id, templates, tx);
    await generateTasksForTemplates(userId, newPlan.id, newPlan.periodKey, templates, today, mode, tx);
  }
  // Link selected ad-hoc tasks to new plan
  if (adhocTaskIds && adhocTaskIds.length > 0) {
    await updateTasksPlanId(userId, adhocTaskIds, newPlan.id, tx);
  }
  // Unlink deselected ad-hoc tasks from pending plan, then complete it
  if (pendingPlan) {
    await unlinkAdhocTasksFromPlan(userId, pendingPlan.id, adhocTaskIds ?? [], tx);
    await updatePlanStatus(userId, pendingPlan.id, PlanStatus.COMPLETED, tx);
  }
  await updateLastSyncDate(userId, newPlan.id, today, tx);
  return newPlan;
}

/**
 * Create a plan from an approved AI draft, inside a caller-provided transaction.
 * Batch-creates the draft's new templates (`templateId === null`), resolves every
 * entry to a real templateId, then runs the shared plan-creation core. Keeps the
 * whole approval (new templates + plan) atomic.
 */
export async function createPlanFromDraft(
  tx: Prisma.TransactionClient,
  userId: string,
  params: {
    draftTemplates: DraftTemplate[];
    description?: string;
    mode: PlanMode;
    adhocTaskIds?: string[];
    pendingPlan: PlanItem | null;
  },
  periodKey: string,
  today: Date
): Promise<PlanItem> {
  const { draftTemplates, description, mode, adhocTaskIds, pendingPlan } = params;

  const newEntries = draftTemplates.filter((d) => d.templateId === null);
  const createdIds = newEntries.length
    ? await createManyTaskTemplates(
        newEntries.map((d) => ({
          userId,
          title: d.title,
          description: d.description,
          size: d.size,
        })),
        tx
      )
    : [];

  // Zip freshly-created ids back to the null entries (input order preserved).
  let nextNew = 0;
  const templates: PlanTemplateInput[] = draftTemplates.map((d) => ({
    templateId: d.templateId ?? createdIds[nextNew++].id,
    type: d.type,
    frequency: d.frequency,
  }));

  return createPlanInTx(
    tx,
    userId,
    { periodType: PeriodType.WEEKLY, periodKey, description, mode, templates, adhocTaskIds, pendingPlan },
    today
  );
}

export async function createPlan(
  userId: string,
  data: CreatePlanData
): Promise<PlanItem | { error: { formErrors: string[]; fieldErrors: Record<string, never> } }> {
  const { periodType, description, mode, templates, adhocTaskIds } = data;

  // Guard reads — before transaction to keep connection hold time short
  const existing = await getActivePlan(userId);
  if (existing) {
    return { error: { formErrors: ["An active plan already exists"], fieldErrors: {} } };
  }
  const pendingPlan = await getPlanByStatus(userId, PlanStatus.PENDING_UPDATE);

  const today = getTodayDate();
  const periodKey = getISOWeekKey(today);

  return prisma.$transaction((tx) =>
    createPlanInTx(
      tx,
      userId,
      { periodType, periodKey, description, mode, templates, adhocTaskIds, pendingPlan },
      today
    )
  );
}

export async function updatePlan(
  userId: string,
  planId: string,
  data: UpdatePlanData
): Promise<{ error: { formErrors: string[]; fieldErrors: Record<string, never> } } | undefined> {
  const { description, mode, templates, adhocTaskIds } = data;

  // Ownership gate: loading the owned plan authorizes every downstream mutation,
  // including the plan_templates rows (which have no user_id of their own).
  const ownedPlan = await getPlanWithTemplates(userId, planId);
  if (!ownedPlan) {
    return { error: { formErrors: ["Plan not found"], fieldErrors: {} } };
  }

  const hasTemplateChanges = templates !== undefined;
  const hasAdhocChanges = adhocTaskIds !== undefined;
  const hasDescriptionChange = description !== undefined;
  const hasModeChange = mode !== undefined;

  if (hasTemplateChanges || hasAdhocChanges) {
    // Reuse the PlanTemplate records already loaded by the ownership gate — diff doesn't need transactional isolation
    const currentLinks = hasTemplateChanges ? ownedPlan.planTemplates : [];
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

    // Resolve effective mode: use new mode if changed, otherwise the owned plan's current mode
    const effectiveMode = mode ?? ownedPlan.mode;

    await prisma.$transaction(async (tx) => {
      // Template changes
      if (hasTemplateChanges) {
        // Removed: delete TODO/DOING tasks + remove PlanTemplate links
        if (removedIds.length > 0) {
          await deleteIncompleteTasksByTemplateIds(userId, planId, removedIds, tx);
          // plan_templates has no user_id; planId ownership was verified above
          await tx.planTemplate.deleteMany({
            where: { planId, templateId: { in: removedIds } },
          });
        }

        // Modified: delete TODO/DOING tasks, update PlanTemplate, regenerate
        for (const t of modifiedTemplates) {
          await deleteIncompleteTasksByTemplateIds(userId, planId, [t.templateId], tx);
          const link = currentMap.get(t.templateId)!;
          await updatePlanTemplate(link.id, { type: t.type, frequency: t.frequency }, tx);
        }
        if (modifiedTemplates.length > 0) {
          await generateTasksForTemplates(userId, planId, periodKey, modifiedTemplates, today, effectiveMode, tx);
        }

        // Added: create PlanTemplate links + generate instances
        if (addedTemplates.length > 0) {
          await createManyPlanTemplates(planId, addedTemplates, tx);
          await generateTasksForTemplates(userId, planId, periodKey, addedTemplates, today, effectiveMode, tx);
        }

        await updateLastSyncDate(userId, planId, today, tx);
      }

      // Ad-hoc task changes: link new, unlink removed
      if (hasAdhocChanges) {
        if (adhocTaskIds.length > 0) {
          await updateTasksPlanId(userId, adhocTaskIds, planId, tx);
        }
        await unlinkAdhocTasksFromPlan(userId, planId, adhocTaskIds, tx);
      }

      if (hasDescriptionChange || hasModeChange) {
        await dalUpdatePlan(userId, planId, {
          ...(hasDescriptionChange && { description }),
          ...(hasModeChange && { mode }),
        }, tx);
      }
    });
  } else if (hasDescriptionChange || hasModeChange) {
    // Description/mode-only update — single write, no transaction overhead needed
    await dalUpdatePlan(userId, planId, {
      ...(hasDescriptionChange && { description }),
      ...(hasModeChange && { mode }),
    });
  }
}
