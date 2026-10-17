import {prisma} from '@/lib/prisma';
import {getPlanWithTemplates} from '@/lib/db/plans';
import {
  getTaskTemplateById,
  getTaskTemplates,
  updateTaskTemplate,
  type TaskTemplateItem,
} from '@/lib/db/taskTemplates';
import {
  getNonDoneAdhocTasks,
  getPlanTemplateStats,
  type TaskItem,
} from '@/lib/db/tasks';
import {getProjectsWithSteps, type ProjectWithSteps} from '@/lib/db/projects';
import {
  TemplateNotFoundError,
  createPlanFromEntries,
  getCarryOverAdhocTaskIds,
  getCarryOverProjectStepIds,
  getPlanCreationContext,
  resolvePlanEntries,
  updatePlanInTx,
} from './planService';
import {ensureSynced} from './syncService';
import {sizeToPoints} from '@/utils/sizeUtils';
import {rollUpOverall} from '@/utils/statsUtils';
import {applyTemplatePatch, findRepeatedIds} from '@/utils/planUtils';
import {
  countDoneSteps,
  isStepDone,
  toProjectContext,
} from '@/utils/projectUtils';
import {PLANNING_ERROR} from '@/utils/errorMessages';
import {
  KANBAN_TZ,
  formatISODate,
  getMondayFromPeriodKey,
  getSundayFromPeriodKey,
  getTodayDate,
} from '@/utils/dateUtils';
import type {HabitPatchInput, PlanPatchInput, PlanSpecInput} from '@/schemas';
import type {
  AdhocTaskSummary,
  NewPlanEntry,
  PlanChangeRef,
  PlanContext,
  PlanPatchResult,
  PlanProjectStepSummary,
  PlanTemplatePatchConflicts,
  PlanningContext,
  TaskProgress,
  TaskTemplateSummary,
} from '../types/plan';

/**
 * A planning request the user's current data cannot satisfy — an active plan
 * already exists, a stale plan id, conflicting template changes, unknown
 * one-off tasks. Thrown before anything is written; the message (from
 * PLANNING_ERROR) tells the assistant what to do instead.
 */
export class PlanningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanningError';
  }
}

/** Progress of a linked template with no task instances yet (e.g. DAILY on a NORMAL weekend). */
const NO_PROGRESS: TaskProgress = {
  completed: 0,
  expired: 0,
  total: 0,
  completionRate: 0,
};

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

/** New-template inputs as plan entries (`templateId: null` = create it). */
const toNewPlanEntries = (
  newTemplates: Omit<NewPlanEntry, 'templateId'>[],
): NewPlanEntry[] =>
  newTemplates.map(newTemplate => ({...newTemplate, templateId: null}));

const toAdhocTaskSummary = ({
  id,
  title,
  size,
  points,
  status,
}: TaskItem): AdhocTaskSummary => ({taskId: id, title, size, points, status});

/** A step with its project, for the plan tools' step checks and summaries. */
type StepWithProject = {
  step: TaskItem;
  project: ProjectWithSteps;
};

/** Every step of the user's projects (archived included), by id. */
const getStepsWithProjectById = (projectsWithSteps: ProjectWithSteps[]) =>
  new Map<string, StepWithProject>(
    projectsWithSteps.flatMap(project =>
      project.steps.map(step => [step.id, {step, project}] as const),
    ),
  );

/**
 * Steps that can go on a week: unfinished, on no plan, of a project that
 * isn't archived (state UPCOMING).
 */
const isUpcomingStep = ({step, project}: StepWithProject) =>
  !project.isArchived && !isStepDone(step) && step.planId === null;

/** A plan's project steps (done included), newest project first, in path order. */
const toPlanProjectSteps = (
  projectsWithSteps: ProjectWithSteps[],
  planId: string,
): PlanProjectStepSummary[] =>
  projectsWithSteps.flatMap(({id: projectId, title: projectTitle, steps}) =>
    steps
      .filter(step => step.planId === planId)
      .map(({id, instanceIndex, title, size, points, status}) => ({
        stepId: id,
        projectId,
        projectTitle,
        stepNumber: instanceIndex,
        title,
        size,
        points,
        status,
      })),
  );

const toTaskTemplateSummary = ({
  id,
  title,
  description,
  size,
}: Pick<
  TaskTemplateItem,
  'id' | 'title' | 'description' | 'size'
>): TaskTemplateSummary => ({
  templateId: id,
  title,
  description,
  size,
  points: sizeToPoints(size),
});

/** Throws a PlanningError naming every template id the patch cannot apply. */
function assertNoPatchConflicts({
  alreadyInPlan,
  notInPlan,
  repeated,
}: PlanTemplatePatchConflicts) {
  const problems: string[] = [];
  if (alreadyInPlan.length > 0) {
    problems.push(PLANNING_ERROR.TEMPLATES_ALREADY_IN_PLAN(alreadyInPlan));
  }
  if (notInPlan.length > 0) {
    problems.push(PLANNING_ERROR.TEMPLATES_NOT_IN_PLAN(notInPlan));
  }
  if (repeated.length > 0) {
    problems.push(PLANNING_ERROR.TEMPLATES_LISTED_TWICE(repeated));
  }
  if (problems.length > 0) {
    throw new PlanningError(PLANNING_ERROR.PATCH_REJECTED(problems));
  }
}

/** Throws a PlanningError naming every step id a plan patch cannot apply. */
function assertNoStepPatchConflicts({
  repeated,
  notInPlan,
  notUpcoming,
}: {
  repeated: string[];
  notInPlan: string[];
  notUpcoming: string[];
}) {
  const problems: string[] = [];
  if (repeated.length > 0) {
    problems.push(PLANNING_ERROR.PROJECT_STEPS_LISTED_TWICE(repeated));
  }
  if (notInPlan.length > 0) {
    problems.push(PLANNING_ERROR.PROJECT_STEPS_NOT_IN_PLAN(notInPlan));
  }
  if (notUpcoming.length > 0) {
    problems.push(PLANNING_ERROR.PROJECT_STEPS_NOT_UPCOMING(notUpcoming));
  }
  if (problems.length > 0) {
    throw new PlanningError(PLANNING_ERROR.PATCH_REJECTED(problems));
  }
}

/**
 * One plan as the planning tools describe it: its templates with their
 * progress (so far for the active plan), its unfinished one-off tasks, its
 * project steps, and the overall totals. Shared by the planning context and
 * both write results; the context passes the projects it already read.
 */
async function getPlanContextByPlanId(
  userId: string,
  planId: string,
  loadedProjectsWithSteps?: ProjectWithSteps[],
): Promise<PlanContext> {
  const [
    planWithTemplates,
    templateStats,
    nonDoneAdhocTasks,
    projectsWithSteps,
  ] = await Promise.all([
    getPlanWithTemplates(userId, planId),
    getPlanTemplateStats(userId, planId),
    getNonDoneAdhocTasks(userId),
    loadedProjectsWithSteps ?? getProjectsWithSteps(userId),
  ]);
  if (!planWithTemplates) throw new Error(`Plan not found: ${planId}`);

  const {id, periodKey, description, mode, planTemplates} = planWithTemplates;
  const templateStatsById = new Map(
    templateStats.map(stats => [stats.templateId, stats]),
  );
  const {
    completedCount,
    totalCount,
    completionRate,
    dailyCompletionRate,
    totalPoints,
  } = rollUpOverall(templateStats);

  return {
    planId: id,
    periodKey,
    description,
    mode,
    templates: planTemplates.map(
      ({templateId, type, frequency, template: {title, size}}) => {
        const {completed, expired, total, completionRate} =
          templateStatsById.get(templateId) ?? NO_PROGRESS;
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
          completionRate: roundToTwoDecimals(completionRate),
        };
      },
    ),
    adhocTasks: nonDoneAdhocTasks
      .filter(task => task.planId === id)
      .map(toAdhocTaskSummary),
    projectSteps: toPlanProjectSteps(projectsWithSteps, id),
    overall: {
      completed: completedCount,
      expired: templateStats.reduce(
        (expiredCount, stats) => expiredCount + stats.expired,
        0,
      ),
      total: totalCount,
      completionRate: roundToTwoDecimals(completionRate),
      dailyCompletionRate: roundToTwoDecimals(dailyCompletionRate),
      pointsEarned: totalPoints,
    },
  };
}

/**
 * Everything an assistant needs to plan the user's week, habits and projects
 * (MCP `get_planning_context`). Runs the same synced reads as plan creation,
 * so a finished week's plan has already flipped to PENDING_UPDATE and shows up
 * as `lastPlan`. Projects come from one read, shared with both plans' steps.
 */
export async function getPlanningContext(
  userId: string,
): Promise<PlanningContext> {
  const {activePlan, pendingPlan, today, periodKey} =
    await getPlanCreationContext(userId);
  const projectsWithSteps = await getProjectsWithSteps(userId);
  const [existingTaskTemplates, activePlanContext, pendingPlanContext] =
    await Promise.all([
      getTaskTemplates(userId),
      activePlan &&
        getPlanContextByPlanId(userId, activePlan.id, projectsWithSteps),
      pendingPlan &&
        getPlanContextByPlanId(userId, pendingPlan.id, projectsWithSteps),
    ]);
  const activePlanId = activePlan?.id ?? null;

  return {
    today: formatISODate(today),
    weekday: today.toLocaleDateString('en-US', {weekday: 'long'}),
    timeZone: KANBAN_TZ,
    week: {
      periodKey,
      start: formatISODate(getMondayFromPeriodKey(periodKey)),
      end: formatISODate(getSundayFromPeriodKey(periodKey)),
    },
    activePlan: activePlanContext,
    lastPlan: pendingPlanContext,
    templates: existingTaskTemplates.map(toTaskTemplateSummary),
    projects: projectsWithSteps
      .filter(({isArchived}) => !isArchived)
      .map(project => toProjectContext(project, activePlanId)),
    archivedProjects: projectsWithSteps
      .filter(({isArchived}) => isArchived)
      .map(({id, title, goal, steps}) => ({
        projectId: id,
        title,
        goal,
        doneCount: countDoneSteps(steps),
        stepCount: steps.length,
      })),
  };
}

/**
 * Create this week's plan from existing templates plus brand-new ones (MCP
 * `create_plan`), with the shared creation guard. Carries over all of the
 * last plan's unfinished one-off tasks and project steps unless
 * `carryOverAdhocTaskIds` / `carryOverProjectStepIds` pick a subset, and puts
 * `addProjectStepIds` (upcoming steps) on the week. New templates and the
 * plan are written in one transaction.
 */
export async function createPlanFromSpec(
  userId: string,
  planSpec: PlanSpecInput,
): Promise<{plan: PlanContext}> {
  const {
    description,
    mode,
    templates,
    newTemplates,
    carryOverAdhocTaskIds,
    carryOverProjectStepIds,
    addProjectStepIds,
  } = planSpec;

  const {activePlan, pendingPlan, today, periodKey} =
    await getPlanCreationContext(userId);
  if (activePlan) {
    throw new PlanningError(PLANNING_ERROR.ACTIVE_PLAN_EXISTS(activePlan.id));
  }

  const repeatedTemplateIds = findRepeatedIds(
    templates.map(template => template.templateId),
  );
  if (repeatedTemplateIds.length > 0) {
    throw new PlanningError(
      PLANNING_ERROR.TEMPLATES_LISTED_TWICE(repeatedTemplateIds),
    );
  }

  const [carryOverCandidateIds, carryOverStepCandidateIds, projectsWithSteps] =
    await Promise.all([
      getCarryOverAdhocTaskIds(userId, pendingPlan),
      getCarryOverProjectStepIds(userId, pendingPlan),
      getProjectsWithSteps(userId),
    ]);
  const adhocTaskIdsToCarry = carryOverAdhocTaskIds ?? carryOverCandidateIds;
  const notCarryableTaskIds = adhocTaskIdsToCarry.filter(
    taskId => !carryOverCandidateIds.includes(taskId),
  );
  if (notCarryableTaskIds.length > 0) {
    throw new PlanningError(
      PLANNING_ERROR.ADHOC_TASKS_NOT_IN_LAST_PLAN(notCarryableTaskIds),
    );
  }

  const stepIdsToCarry = carryOverProjectStepIds ?? carryOverStepCandidateIds;
  const notCarryableStepIds = stepIdsToCarry.filter(
    stepId => !carryOverStepCandidateIds.includes(stepId),
  );
  if (notCarryableStepIds.length > 0) {
    throw new PlanningError(
      PLANNING_ERROR.PROJECT_STEPS_NOT_IN_LAST_PLAN(notCarryableStepIds),
    );
  }
  // A LAST_WEEK step passed to add is reported as not upcoming (carry-over
  // takes it), which tells the assistant more than "listed twice"
  const stepsWithProjectById = getStepsWithProjectById(projectsWithSteps);
  const notUpcomingStepIds = addProjectStepIds.filter(stepId => {
    const stepWithProject = stepsWithProjectById.get(stepId);
    return !stepWithProject || !isUpcomingStep(stepWithProject);
  });
  if (notUpcomingStepIds.length > 0) {
    throw new PlanningError(
      PLANNING_ERROR.PROJECT_STEPS_NOT_UPCOMING(notUpcomingStepIds),
    );
  }
  const projectStepIds = [...stepIdsToCarry, ...addProjectStepIds];
  const repeatedStepIds = findRepeatedIds(projectStepIds);
  if (repeatedStepIds.length > 0) {
    throw new PlanningError(
      PLANNING_ERROR.PROJECT_STEPS_LISTED_TWICE(repeatedStepIds),
    );
  }

  const planEntries = [...templates, ...toNewPlanEntries(newTemplates)];
  if (
    planEntries.length === 0 &&
    adhocTaskIdsToCarry.length === 0 &&
    projectStepIds.length === 0
  ) {
    throw new PlanningError(PLANNING_ERROR.EMPTY_PLAN);
  }

  const createdPlan = await prisma.$transaction(tx =>
    createPlanFromEntries(
      tx,
      userId,
      {
        entries: planEntries,
        description,
        mode,
        adhocTaskIds: adhocTaskIdsToCarry,
        projectStepIds,
        pendingPlan,
      },
      periodKey,
      today,
    ),
  );
  return {plan: await getPlanContextByPlanId(userId, createdPlan.id)};
}

/**
 * Apply a patch to this week's ACTIVE plan (MCP `update_plan`). Only the
 * current-week plan can change, so a plan id read before a week rollover fails
 * instead of editing last week. The patch becomes a full template list for the
 * shared update core; new templates and the update are one transaction.
 */
export async function patchActivePlan(
  userId: string,
  planPatch: PlanPatchInput,
): Promise<PlanPatchResult> {
  const {
    planId,
    description,
    mode,
    addTemplates,
    newTemplates,
    updateTemplates,
    removeTemplateIds,
    removeAdhocTaskIds,
    addProjectStepIds,
    removeProjectStepIds,
  } = planPatch;

  // Ownership + current-week gate: ensureSynced returns the user's own
  // current-week ACTIVE plan (a finished week's plan is flipped first).
  const activePlan = await ensureSynced(userId);
  if (!activePlan) {
    throw new PlanningError(PLANNING_ERROR.NO_ACTIVE_PLAN(planId));
  }
  if (activePlan.id !== planId) {
    throw new PlanningError(
      PLANNING_ERROR.NOT_ACTIVE_PLAN(planId, activePlan.id),
    );
  }

  const [planBeforePatch, nonDoneAdhocTasks, projectsWithSteps] =
    await Promise.all([
      getPlanWithTemplates(userId, planId),
      getNonDoneAdhocTasks(userId),
      getProjectsWithSteps(userId),
    ]);
  if (!planBeforePatch) throw new Error(`Plan not found: ${planId}`);

  const {templates: patchedTemplates, conflicts} = applyTemplatePatch(
    planBeforePatch.planTemplates,
    {addTemplates, updateTemplates, removeTemplateIds},
  );
  assertNoPatchConflicts(conflicts);

  const stepsWithProjectById = getStepsWithProjectById(projectsWithSteps);
  const planStepIds = [...stepsWithProjectById.values()]
    .filter(({step}) => step.planId === planId && !isStepDone(step))
    .map(({step}) => step.id);
  assertNoStepPatchConflicts({
    repeated: findRepeatedIds([...addProjectStepIds, ...removeProjectStepIds]),
    notInPlan: removeProjectStepIds.filter(
      stepId => !planStepIds.includes(stepId),
    ),
    notUpcoming: addProjectStepIds.filter(stepId => {
      const stepWithProject = stepsWithProjectById.get(stepId);
      return !stepWithProject || !isUpcomingStep(stepWithProject);
    }),
  });
  const hasStepChanges =
    addProjectStepIds.length > 0 || removeProjectStepIds.length > 0;
  const nextPlanStepIds = [
    ...planStepIds.filter(stepId => !removeProjectStepIds.includes(stepId)),
    ...addProjectStepIds,
  ];

  const planAdhocTasks = nonDoneAdhocTasks.filter(
    task => task.planId === planId,
  );
  const unknownAdhocTaskIds = removeAdhocTaskIds.filter(
    taskId => !planAdhocTasks.some(task => task.id === taskId),
  );
  if (unknownAdhocTaskIds.length > 0) {
    throw new PlanningError(
      PLANNING_ERROR.ADHOC_TASKS_NOT_IN_PLAN(unknownAdhocTaskIds),
    );
  }
  const removedAdhocTasks = planAdhocTasks.filter(task =>
    removeAdhocTaskIds.includes(task.id),
  );
  const keptAdhocTaskIds = planAdhocTasks
    .filter(task => !removeAdhocTaskIds.includes(task.id))
    .map(task => task.id);

  const hasTemplateChanges = [
    addTemplates,
    newTemplates,
    updateTemplates,
    removeTemplateIds,
  ].some(list => list.length > 0);

  const templateDiff = await prisma.$transaction(async tx => {
    // The update core takes the full template list; new templates get ids first.
    const nextTemplates = hasTemplateChanges
      ? await resolvePlanEntries(tx, userId, [
          ...patchedTemplates,
          ...toNewPlanEntries(newTemplates),
        ])
      : undefined;
    return updatePlanInTx(
      tx,
      userId,
      planBeforePatch,
      {
        description,
        mode,
        templates: nextTemplates,
        adhocTaskIds:
          removedAdhocTasks.length > 0 ? keptAdhocTaskIds : undefined,
        projectStepIds: hasStepChanges ? nextPlanStepIds : undefined,
      },
      getTodayDate(),
    );
  });

  const planAfterPatch = await getPlanContextByPlanId(userId, planId);
  // Titles of removed templates come from the plan before the patch.
  const templateTitleById = new Map([
    ...planBeforePatch.planTemplates.map(
      ({templateId, template: {title}}) => [templateId, title] as const,
    ),
    ...planAfterPatch.templates.map(
      ({templateId, title}) => [templateId, title] as const,
    ),
  ]);
  const toChangeRef = (templateId: string): PlanChangeRef => ({
    id: templateId,
    title: templateTitleById.get(templateId) ?? '',
  });
  const toStepChangeRef = (stepId: string): PlanChangeRef => ({
    id: stepId,
    title: stepsWithProjectById.get(stepId)?.step.title ?? '',
  });

  return {
    changes: {
      addedTemplates: templateDiff.added.map(template =>
        toChangeRef(template.templateId),
      ),
      modifiedTemplates: templateDiff.modified.map(template =>
        toChangeRef(template.templateId),
      ),
      removedTemplates: templateDiff.removed.map(toChangeRef),
      removedAdhocTasks: removedAdhocTasks.map(({id, title}) => ({id, title})),
      addedProjectSteps: addProjectStepIds.map(toStepChangeRef),
      removedProjectSteps: removeProjectStepIds.map(toStepChangeRef),
    },
    plan: planAfterPatch,
  };
}

/**
 * Change a habit's own fields — title, description, size (MCP
 * `update_habit`). Task instances generated from now on use them; ones
 * already generated keep theirs. How often it runs is the plan's.
 */
export async function updateHabit(
  userId: string,
  habitPatch: HabitPatchInput,
): Promise<{habit: TaskTemplateSummary}> {
  const {templateId, title, description, size} = habitPatch;
  const {count} = await updateTaskTemplate(userId, templateId, {
    title,
    description,
    size,
  });
  const template =
    count > 0 ? await getTaskTemplateById(userId, templateId) : null;
  if (!template) throw new TemplateNotFoundError([templateId]);
  return {habit: toTaskTemplateSummary(template)};
}
