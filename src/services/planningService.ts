import prisma from '@/lib/prisma';
import {getPlanWithTemplates} from '@/lib/db/plans';
import {getTaskTemplates} from '@/lib/db/taskTemplates';
import {
  getNonDoneAdhocTasks,
  getPlanTemplateStats,
  type TaskItem,
} from '@/lib/db/tasks';
import {
  createPlanFromEntries,
  getCarryOverAdhocTaskIds,
  getPlanCreationContext,
  resolvePlanEntries,
  updatePlanInTx,
} from './planService';
import {ensureSynced} from './syncService';
import {sizeToPoints} from '@/utils/sizeUtils';
import {rollUpOverall} from '@/utils/statsUtils';
import {applyTemplatePatch, findRepeated} from '@/utils/planUtils';
import {
  KANBAN_TZ,
  formatISODate,
  getMondayFromPeriodKey,
  getSundayFromPeriodKey,
  getTodayDate,
} from '@/utils/dateUtils';
import type {PlanPatchInput, PlanSpecInput} from '@/schemas';
import type {
  NewPlanEntry,
  PlanChangeRef,
  PlanPatchOutcome,
  PlanTemplatePatchConflicts,
  PlanningAdhocTask,
  PlanningContext,
  PlanningPlan,
  PlanningProgress,
} from '../types/plan';

/**
 * A planning request the user's current data cannot satisfy — an active plan
 * already exists, a stale plan id, conflicting template changes, unknown
 * one-off tasks. Thrown before anything is written; the message tells the
 * assistant what to do instead.
 */
export class PlanningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanningError';
  }
}

const CONFLICT_REASONS = [
  ['alreadyInPlan', 'already in the plan (change them with updateTemplates)'],
  ['notInPlan', 'not in the plan'],
  ['repeated', 'named more than once'],
] as const;

/** A linked template with no task instances yet (e.g. DAILY on a NORMAL weekend). */
const NO_PROGRESS: PlanningProgress = {
  completed: 0,
  expired: 0,
  total: 0,
  completionRate: 0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const toNewPlanEntries = (
  newTemplates: Omit<NewPlanEntry, 'templateId'>[],
): NewPlanEntry[] => newTemplates.map(t => ({...t, templateId: null}));

const toPlanningAdhocTask = ({
  id,
  title,
  size,
  points,
  status,
}: TaskItem): PlanningAdhocTask => ({taskId: id, title, size, points, status});

function assertNoConflicts(conflicts: PlanTemplatePatchConflicts) {
  const problems = CONFLICT_REASONS.filter(
    ([key]) => conflicts[key].length > 0,
  ).map(([key, reason]) => `${reason}: ${conflicts[key].join(', ')}`);
  if (problems.length > 0) {
    throw new PlanningError(
      `No changes were made. Template ids ${problems.join('; ')}.`,
    );
  }
}

/**
 * One plan as the planning tools describe it: its template lines with their
 * instance counts (so far for the active plan), its unfinished one-off tasks,
 * and the overall totals.
 */
async function getPlanningPlan(
  userId: string,
  planId: string,
): Promise<PlanningPlan> {
  const [plan, statRows, adhocTasks] = await Promise.all([
    getPlanWithTemplates(userId, planId),
    getPlanTemplateStats(userId, planId),
    getNonDoneAdhocTasks(userId),
  ]);
  if (!plan) throw new Error(`Plan not found: ${planId}`);

  const {id, periodKey, description, mode, planTemplates} = plan;
  const statsByTemplate = new Map(statRows.map(r => [r.templateId, r]));
  const {
    completedCount,
    totalCount,
    completionRate,
    dailyCompletionRate,
    totalPoints,
  } = rollUpOverall(statRows);

  return {
    planId: id,
    periodKey,
    description,
    mode,
    templates: planTemplates.map(
      ({templateId, type, frequency, template: {title, size}}) => {
        const {completed, expired, total, completionRate} =
          statsByTemplate.get(templateId) ?? NO_PROGRESS;
        return {
          templateId,
          title,
          size,
          points: sizeToPoints(size),
          type,
          frequency,
          completed,
          expired,
          total,
          completionRate: round2(completionRate),
        };
      },
    ),
    adhocTasks: adhocTasks
      .filter(t => t.planId === id)
      .map(toPlanningAdhocTask),
    overall: {
      completed: completedCount,
      expired: statRows.reduce((sum, r) => sum + r.expired, 0),
      total: totalCount,
      completionRate: round2(completionRate),
      dailyCompletionRate: round2(dailyCompletionRate),
      pointsEarned: totalPoints,
    },
  };
}

/**
 * Everything an assistant needs to plan the user's week (MCP
 * `get_planning_context`). Runs the same synced reads as plan creation, so a
 * finished week's plan has already flipped to PENDING_UPDATE and shows up as
 * `lastPlan`.
 */
export async function getPlanningContext(
  userId: string,
): Promise<PlanningContext> {
  const {activePlan, pendingPlan, today, periodKey} =
    await getPlanCreationContext(userId);
  const [templates, active, last] = await Promise.all([
    getTaskTemplates(userId),
    activePlan && getPlanningPlan(userId, activePlan.id),
    pendingPlan && getPlanningPlan(userId, pendingPlan.id),
  ]);

  return {
    today: formatISODate(today),
    weekday: today.toLocaleDateString('en-US', {weekday: 'long'}),
    timeZone: KANBAN_TZ,
    week: {
      periodKey,
      start: formatISODate(getMondayFromPeriodKey(periodKey)),
      end: formatISODate(getSundayFromPeriodKey(periodKey)),
    },
    activePlan: active,
    lastPlan: last,
    templates: templates.map(({id, title, description, size}) => ({
      templateId: id,
      title,
      description,
      size,
      points: sizeToPoints(size),
    })),
  };
}

/**
 * Create this week's plan from existing templates plus brand-new ones (MCP
 * `create_plan`), with the shared creation guard. Carries over all of the
 * last plan's unfinished one-off tasks unless `carryOverAdhocTaskIds` picks a
 * subset. New templates and the plan are written in one transaction.
 */
export async function createPlanFromSpec(
  userId: string,
  spec: PlanSpecInput,
): Promise<{plan: PlanningPlan}> {
  const {description, mode, templates, newTemplates, carryOverAdhocTaskIds} =
    spec;

  const {activePlan, pendingPlan, today, periodKey} =
    await getPlanCreationContext(userId);
  if (activePlan) {
    throw new PlanningError(
      `This week already has an active plan (${activePlan.id}); change that plan instead of creating another.`,
    );
  }

  const repeated = findRepeated(templates.map(t => t.templateId));
  if (repeated.length > 0) {
    throw new PlanningError(
      `Templates listed more than once: ${repeated.join(', ')}.`,
    );
  }

  const carryOverIds = await getCarryOverAdhocTaskIds(userId, pendingPlan);
  const adhocTaskIds = carryOverAdhocTaskIds ?? carryOverIds;
  const notCarryable = adhocTaskIds.filter(id => !carryOverIds.includes(id));
  if (notCarryable.length > 0) {
    throw new PlanningError(
      `Not unfinished one-off tasks of the last plan: ${notCarryable.join(', ')}.`,
    );
  }

  const entries = [...templates, ...toNewPlanEntries(newTemplates)];
  if (entries.length === 0 && adhocTaskIds.length === 0) {
    throw new PlanningError(
      'A plan needs at least one template or carried-over one-off task.',
    );
  }

  const plan = await prisma.$transaction(tx =>
    createPlanFromEntries(
      tx,
      userId,
      {entries, description, mode, adhocTaskIds, pendingPlan},
      periodKey,
      today,
    ),
  );
  return {plan: await getPlanningPlan(userId, plan.id)};
}

/**
 * Apply a patch to this week's ACTIVE plan (MCP `update_plan`). Only the
 * current-week plan can change, so a plan id read before a week rollover fails
 * instead of editing last week. The patch becomes a full template list for the
 * shared update core; new templates and the update are one transaction.
 */
export async function patchActivePlan(
  userId: string,
  patch: PlanPatchInput,
): Promise<PlanPatchOutcome> {
  const {
    planId,
    description,
    mode,
    addTemplates,
    newTemplates,
    updateTemplates,
    removeTemplateIds,
    removeAdhocTaskIds,
  } = patch;

  // Ownership + current-week gate: ensureSynced returns the user's own
  // current-week ACTIVE plan (a finished week's plan is flipped first).
  const activePlan = await ensureSynced(userId);
  if (activePlan?.id !== planId) {
    throw new PlanningError(
      activePlan
        ? `Plan ${planId} is not this week's active plan; the active plan is ${activePlan.id}.`
        : `Plan ${planId} is not this week's active plan; this week has no active plan yet, so create one.`,
    );
  }

  const [ownedPlan, adhocTasks] = await Promise.all([
    getPlanWithTemplates(userId, planId),
    getNonDoneAdhocTasks(userId),
  ]);
  if (!ownedPlan) throw new Error(`Plan not found: ${planId}`);

  const {templates, conflicts} = applyTemplatePatch(ownedPlan.planTemplates, {
    addTemplates,
    updateTemplates,
    removeTemplateIds,
  });
  assertNoConflicts(conflicts);

  const linkedAdhoc = adhocTasks.filter(t => t.planId === planId);
  const linkedAdhocIds = new Set(linkedAdhoc.map(t => t.id));
  const notLinked = removeAdhocTaskIds.filter(id => !linkedAdhocIds.has(id));
  if (notLinked.length > 0) {
    throw new PlanningError(
      `Not unfinished one-off tasks of this plan: ${notLinked.join(', ')}.`,
    );
  }

  const templatesChanged = [
    addTemplates,
    newTemplates,
    updateTemplates,
    removeTemplateIds,
  ].some(list => list.length > 0);
  const removedAdhoc = linkedAdhoc.filter(t =>
    removeAdhocTaskIds.includes(t.id),
  );

  const diff = await prisma.$transaction(async tx => {
    const nextTemplates = templatesChanged
      ? await resolvePlanEntries(tx, userId, [
          ...templates,
          ...toNewPlanEntries(newTemplates),
        ])
      : undefined;
    return updatePlanInTx(
      tx,
      userId,
      ownedPlan,
      {
        description,
        mode,
        templates: nextTemplates,
        adhocTaskIds:
          removedAdhoc.length > 0
            ? linkedAdhoc.filter(t => !removedAdhoc.includes(t)).map(t => t.id)
            : undefined,
      },
      getTodayDate(),
    );
  });

  const plan = await getPlanningPlan(userId, planId);
  // Titles of removed templates come from the plan as it was before the patch.
  const titleById = new Map([
    ...ownedPlan.planTemplates.map(
      ({templateId, template}) => [templateId, template.title] as const,
    ),
    ...plan.templates.map(
      ({templateId, title}) => [templateId, title] as const,
    ),
  ]);
  const toRef = (id: string): PlanChangeRef => ({
    id,
    title: titleById.get(id) ?? '',
  });

  return {
    changes: {
      addedTemplates: diff.added.map(t => toRef(t.templateId)),
      modifiedTemplates: diff.modified.map(t => toRef(t.templateId)),
      removedTemplates: diff.removed.map(toRef),
      removedAdhocTasks: removedAdhoc.map(({id, title}) => ({id, title})),
    },
    plan,
  };
}
