import {z} from 'zod';
import {
  getPlanByStatus,
  getPlanWithTemplates,
  createPlan as dalCreatePlan,
  updatePlan as dalUpdatePlan,
  updateLastSyncDate,
  updatePlanStatus,
} from '@/lib/db/plans';
import {
  createManyPlanTemplates,
  updatePlanTemplate,
} from '@/lib/db/planTemplates';
import {
  createManyTaskTemplates,
  getOwnedTemplateIds,
} from '@/lib/db/taskTemplates';
import {
  createManyTasks,
  deleteIncompleteTasksByTemplateIds,
  getNonDoneAdhocTasks,
  updateTasksPlanId,
  unlinkAdhocTasksFromPlan,
} from '@/lib/db/tasks';
import {
  Prisma,
  PeriodType,
  PlanMode,
  TaskType,
  TaskStatus,
  PlanStatus,
} from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import {getTodayDate, getISOWeekKey, isWeekend} from '@/utils/dateUtils';
import {sizeToPoints} from '@/utils/sizeUtils';
import {diffPlanTemplates} from '@/utils/planUtils';
import {ensureSynced} from './syncService';
import type {PlanItem, PlanWithTemplates} from '@/lib/db/plans';
import type {
  NewPlanEntry,
  PlanCreationContext,
  PlanEntry,
  PlanTemplateDiff,
  PlanTemplateInput,
} from '../types/plan';
import type {createPlanSchema, updatePlanSchema} from '@/schemas';

type CreatePlanData = z.infer<typeof createPlanSchema>;
type UpdatePlanData = z.infer<typeof updatePlanSchema>;
type FormError = {
  error: {formErrors: string[]; fieldErrors: Record<string, never>};
};

const uuidSchema = z.string().uuid();

/**
 * A plan references templates the user does not own (or that do not exist).
 * Thrown inside the plan transaction, so nothing is written; each entry point
 * maps it to its own error surface.
 */
export class TemplateNotFoundError extends Error {
  readonly templateIds: string[];

  constructor(templateIds: string[]) {
    super(`Template not found: ${templateIds.join(', ')}`);
    this.name = 'TemplateNotFoundError';
    this.templateIds = templateIds;
  }
}

/**
 * Throws TemplateNotFoundError unless every id is a template the user owns.
 * Malformed ids (e.g. an LLM-invented one) never reach the uuid column.
 */
async function assertTemplatesOwned(
  tx: Prisma.TransactionClient,
  userId: string,
  templateIds: string[],
) {
  const wellFormed = templateIds.filter(id => uuidSchema.safeParse(id).success);
  const owned = await getOwnedTemplateIds(userId, wellFormed, tx);
  const missing = templateIds.filter(id => !owned.has(id));
  if (missing.length > 0) throw new TemplateNotFoundError(missing);
}

async function generateTasksForTemplates(
  userId: string,
  planId: string,
  periodKey: string,
  templates: PlanTemplateInput[],
  today: Date,
  mode: PlanMode,
  tx?: Prisma.TransactionClient,
) {
  const taskData: Parameters<typeof createManyTasks>[0] = [];

  for (const {templateId, type, frequency} of templates) {
    // We need the template's title, description, and points for the Task record.
    // Scope the lookup to the user so a foreign templateId smuggled through the
    // form can't be used to generate tasks. This stays inside the transaction to
    // keep it consistent.
    const db = tx ?? prisma;
    const template = await db.taskTemplate.findFirst({
      where: {id: templateId, userId},
      select: {title: true, description: true, size: true},
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
            status: TaskStatus.BACKLOG,
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
            status: TaskStatus.BACKLOG,
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
 * Guard reads shared by every plan-creation entry point (plan form, AI draft
 * approval, MCP). Syncs first, so an ACTIVE plan from a finished week has
 * already flipped to PENDING_UPDATE and does not block creation. Runs before
 * the transaction to keep connection hold time short.
 */
export async function getPlanCreationContext(
  userId: string,
): Promise<PlanCreationContext> {
  const activePlan = await ensureSynced(userId);
  const pendingPlan = await getPlanByStatus(userId, PlanStatus.PENDING_UPDATE);
  const today = getTodayDate();
  return {activePlan, pendingPlan, today, periodKey: getISOWeekKey(today)};
}

/**
 * The pending plan's non-done ad-hoc tasks: carried over to the new plan when
 * the caller has no explicit selection (AI approval, MCP).
 */
export async function getCarryOverAdhocTaskIds(
  userId: string,
  pendingPlan: PlanItem | null,
): Promise<string[]> {
  if (!pendingPlan) return [];
  const adhoc = await getNonDoneAdhocTasks(userId);
  return adhoc.filter(t => t.planId === pendingPlan.id).map(t => t.id);
}

/**
 * Core plan-creation steps, running inside a caller-provided transaction. Lets
 * other flows (e.g. AI draft approval, which first creates new TaskTemplates)
 * compose plan creation into one atomic transaction. Guard reads (active plan,
 * pending plan) are the caller's responsibility — see getPlanCreationContext.
 * Throws TemplateNotFoundError when a template is not the user's.
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
  today: Date,
): Promise<PlanItem> {
  const {
    periodType,
    periodKey,
    description,
    mode,
    templates,
    adhocTaskIds,
    pendingPlan,
  } = params;

  await assertTemplatesOwned(
    tx,
    userId,
    templates.map(t => t.templateId),
  );

  const newPlan = await dalCreatePlan(
    userId,
    {periodType, periodKey, description, mode},
    tx,
  );
  if (templates.length > 0) {
    await createManyPlanTemplates(newPlan.id, templates, tx);
    await generateTasksForTemplates(
      userId,
      newPlan.id,
      newPlan.periodKey,
      templates,
      today,
      mode,
      tx,
    );
  }
  // Link selected ad-hoc tasks to new plan
  if (adhocTaskIds && adhocTaskIds.length > 0) {
    await updateTasksPlanId(userId, adhocTaskIds, newPlan.id, tx);
  }
  // Unlink deselected ad-hoc tasks from pending plan, then complete it
  if (pendingPlan) {
    await unlinkAdhocTasksFromPlan(
      userId,
      pendingPlan.id,
      adhocTaskIds ?? [],
      tx,
    );
    await updatePlanStatus(userId, pendingPlan.id, PlanStatus.COMPLETED, tx);
  }
  await updateLastSyncDate(userId, newPlan.id, today, tx);
  return newPlan;
}

/**
 * Create a plan from template entries that mix existing templates (by id) and
 * brand-new ones (`templateId: null`), inside a caller-provided transaction.
 * Batch-creates the new templates, resolves every entry to a real templateId,
 * then runs the shared plan-creation core — so new templates + plan are atomic.
 * Used by AI draft approval (a DraftTemplate is a PlanEntry) and the MCP tools.
 */
export async function createPlanFromEntries(
  tx: Prisma.TransactionClient,
  userId: string,
  params: {
    entries: PlanEntry[];
    description?: string;
    mode: PlanMode;
    adhocTaskIds?: string[];
    pendingPlan: PlanItem | null;
  },
  periodKey: string,
  today: Date,
): Promise<PlanItem> {
  const {entries, description, mode, adhocTaskIds, pendingPlan} = params;

  const newEntries = entries.filter(
    (e): e is NewPlanEntry => e.templateId === null,
  );
  const createdIds = newEntries.length
    ? await createManyTaskTemplates(
        newEntries.map(e => ({
          userId,
          title: e.title,
          description: e.description,
          size: e.size,
        })),
        tx,
      )
    : [];

  // Zip freshly-created ids back to the null entries (input order preserved).
  let nextNew = 0;
  const templates: PlanTemplateInput[] = entries.map(e => ({
    templateId: e.templateId ?? createdIds[nextNew++].id,
    type: e.type,
    frequency: e.frequency,
  }));

  return createPlanInTx(
    tx,
    userId,
    {
      periodType: PeriodType.WEEKLY,
      periodKey,
      description,
      mode,
      templates,
      adhocTaskIds,
      pendingPlan,
    },
    today,
  );
}

export async function createPlan(
  userId: string,
  data: CreatePlanData,
): Promise<PlanItem | FormError> {
  const {periodType, description, mode, templates, adhocTaskIds} = data;

  const {activePlan, pendingPlan, today, periodKey} =
    await getPlanCreationContext(userId);
  if (activePlan) {
    return {
      error: {formErrors: ['An active plan already exists'], fieldErrors: {}},
    };
  }

  return prisma.$transaction(tx =>
    createPlanInTx(
      tx,
      userId,
      {
        periodType,
        periodKey,
        description,
        mode,
        templates,
        adhocTaskIds,
        pendingPlan,
      },
      today,
    ),
  );
}

/**
 * Apply a plan update inside a caller-provided transaction: template links
 * (with task regeneration), ad-hoc links, description and mode — each only
 * when present in `data`. Lets other flows (MCP, which first creates new
 * templates) compose the update into one atomic transaction. `ownedPlan` is the
 * caller's ownership gate: loading it authorizes every downstream mutation,
 * including the plan_templates rows (which have no user_id of their own).
 * Returns the applied template diff; throws TemplateNotFoundError when an
 * added template is not the user's.
 */
export async function updatePlanInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  ownedPlan: PlanWithTemplates,
  data: UpdatePlanData,
  today: Date,
): Promise<PlanTemplateDiff> {
  const {description, mode, templates, adhocTaskIds} = data;
  const planId = ownedPlan.id;
  const currentLinks = ownedPlan.planTemplates;
  const diff = diffPlanTemplates(currentLinks, templates ?? currentLinks);

  // Template changes
  if (templates !== undefined) {
    const {added, removed, modified} = diff;
    await assertTemplatesOwned(
      tx,
      userId,
      added.map(t => t.templateId),
    );

    const periodKey = getISOWeekKey(today);
    // Resolve effective mode: use new mode if changed, otherwise the owned plan's current mode
    const effectiveMode = mode ?? ownedPlan.mode;
    const linkByTemplateId = new Map(currentLinks.map(l => [l.templateId, l]));

    // Removed: delete BACKLOG/TODO/DOING tasks + remove PlanTemplate links
    if (removed.length > 0) {
      await deleteIncompleteTasksByTemplateIds(userId, planId, removed, tx);
      // plan_templates has no user_id; planId ownership was verified by the caller
      await tx.planTemplate.deleteMany({
        where: {planId, templateId: {in: removed}},
      });
    }

    // Modified: delete BACKLOG/TODO/DOING tasks, update PlanTemplate, regenerate
    for (const t of modified) {
      await deleteIncompleteTasksByTemplateIds(
        userId,
        planId,
        [t.templateId],
        tx,
      );
      const link = linkByTemplateId.get(t.templateId)!;
      await updatePlanTemplate(
        link.id,
        {type: t.type, frequency: t.frequency},
        tx,
      );
    }
    if (modified.length > 0) {
      await generateTasksForTemplates(
        userId,
        planId,
        periodKey,
        modified,
        today,
        effectiveMode,
        tx,
      );
    }

    // Added: create PlanTemplate links + generate instances
    if (added.length > 0) {
      await createManyPlanTemplates(planId, added, tx);
      await generateTasksForTemplates(
        userId,
        planId,
        periodKey,
        added,
        today,
        effectiveMode,
        tx,
      );
    }

    await updateLastSyncDate(userId, planId, today, tx);
  }

  // Ad-hoc task changes: link new, unlink removed
  if (adhocTaskIds !== undefined) {
    if (adhocTaskIds.length > 0) {
      await updateTasksPlanId(userId, adhocTaskIds, planId, tx);
    }
    await unlinkAdhocTasksFromPlan(userId, planId, adhocTaskIds, tx);
  }

  if (description !== undefined || mode !== undefined) {
    await dalUpdatePlan(
      userId,
      planId,
      {
        ...(description !== undefined && {description}),
        ...(mode !== undefined && {mode}),
      },
      tx,
    );
  }

  return diff;
}

export async function updatePlan(
  userId: string,
  planId: string,
  data: UpdatePlanData,
): Promise<FormError | {diff: PlanTemplateDiff}> {
  const {description, mode, templates, adhocTaskIds} = data;

  // Ownership gate: loading the owned plan authorizes every downstream mutation.
  const ownedPlan = await getPlanWithTemplates(userId, planId);
  if (!ownedPlan) {
    return {error: {formErrors: ['Plan not found'], fieldErrors: {}}};
  }

  if (templates !== undefined || adhocTaskIds !== undefined) {
    const today = getTodayDate();
    const diff = await prisma.$transaction(tx =>
      updatePlanInTx(tx, userId, ownedPlan, data, today),
    );
    return {diff};
  }

  if (description !== undefined || mode !== undefined) {
    // Description/mode-only update — single write, no transaction overhead needed
    await dalUpdatePlan(userId, planId, {
      ...(description !== undefined && {description}),
      ...(mode !== undefined && {mode}),
    });
  }
  return {
    diff: diffPlanTemplates(ownedPlan.planTemplates, ownedPlan.planTemplates),
  };
}
