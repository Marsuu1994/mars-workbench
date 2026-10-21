import {beforeEach, describe, expect, it} from 'vitest';
import {PlanStatus} from '@/generated/prisma/client';
import {prisma} from '@/lib/prisma';
import {planPatchSchema} from '@/schemas';
import {PlanMode, TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {PLANNING_ERROR} from '@/utils/errorMessages';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  moveTasks,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, NEXT_WEEK_KEY, WEEK_KEY, freezeTime} from '../../test/time';
import {trackTaskThisWeek} from './matrixService';
import {TemplateNotFoundError} from './planService';
import {
  createPlanFromSpec,
  getPlanningContext,
  patchActivePlan,
  updateHabit,
} from './planningService';
import {planSpecSchema} from '@/schemas';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

const RUN = newHabit('Run', TaskType.DAILY, 2);
const REVIEW = newHabit('Review', TaskType.WEEKLY, 2);

const countTasks = (where: {templateId?: string; status?: TaskStatus}) =>
  prisma.task.count({where: {userId, ...where}});

const patch = (input: Parameters<typeof planPatchSchema.parse>[0]) =>
  patchActivePlan(userId, planPatchSchema.parse(input));

/**
 * Last week (W42): two habits, a one-off and a step on it, both unfinished,
 * then the clock moves to next Monday so W42 waits as lastPlan.
 */
const createLastWeek = async () => {
  freezeTime(MOMENTS.MONDAY_NOON);
  const {steps} = await createProjectWithSteps(userId, 'Course', [
    'Unit 1',
    'Unit 2',
  ]);
  const passport = await createOneOff(userId, {title: 'Renew passport'});
  const {plan} = await createWeek(userId, {
    newTemplates: [RUN, REVIEW],
    addProjectStepIds: [steps[0].id],
  });
  await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
  freezeTime(MOMENTS.NEXT_MONDAY_NOON);
  return {lastPlan: plan, passport, steps};
};

describe('getPlanningContext', () => {
  it("describes a new user's week", async () => {
    expect(await getPlanningContext(userId)).toEqual({
      today: '2026-10-14',
      weekday: 'Wednesday',
      timeZone: 'America/Los_Angeles',
      week: {periodKey: WEEK_KEY, start: '2026-10-12', end: '2026-10-18'},
      activePlan: null,
      lastPlan: null,
      templates: [],
      projects: [],
      archivedProjects: [],
    });
  });

  it("reports last week's progress and what waits to carry over", async () => {
    const {lastPlan, passport, steps} = await createLastWeek();
    const context = await getPlanningContext(userId);

    expect(context.activePlan).toBeNull();
    expect(context.lastPlan).toMatchObject({
      planId: lastPlan.planId,
      periodKey: WEEK_KEY,
      adhocTasks: [{taskId: passport.id, status: TaskStatus.TODO}],
      projectSteps: [{stepId: steps[0].id, stepNumber: 1}],
      // Monday's two runs and the two reviews all expired
      overall: {completed: 0, expired: 4, total: 4, completionRate: 0},
    });
    expect(context.templates.map(({title}) => title).sort()).toEqual([
      'Review',
      'Run',
    ]);
    expect(context.projects[0].steps.map(({state}) => state)).toEqual([
      'LAST_WEEK',
      'UPCOMING',
    ]);
  });
});

describe('createPlanFromSpec', () => {
  it("creates this week's plan and generates its habit instances", async () => {
    const {plan} = await createWeek(userId, {newTemplates: [RUN, REVIEW]});

    expect(plan).toMatchObject({periodKey: WEEK_KEY, mode: PlanMode.NORMAL});
    // Lines created together share a createdAt, so their order is the DB's
    expect(
      plan.templates
        .map(({title, type, frequency, total}) => [
          title,
          type,
          frequency,
          total,
        ])
        .sort(),
    ).toEqual([
      ['Review', TaskType.WEEKLY, 2, 2],
      ['Run', TaskType.DAILY, 2, 2],
    ]);
  });

  it('refuses a second plan for the same week', async () => {
    const {plan} = await createWeek(userId, {newTemplates: [RUN]});
    await expect(createWeek(userId, {newTemplates: [REVIEW]})).rejects.toThrow(
      PLANNING_ERROR.ACTIVE_PLAN_EXISTS(plan.planId),
    );
  });

  it('refuses an empty plan', async () => {
    await expect(createWeek(userId, {})).rejects.toThrow(
      PLANNING_ERROR.EMPTY_PLAN,
    );
  });

  it("refuses another user's template and writes nothing", async () => {
    const otherUserId = newUserId();
    const {plan: otherPlan} = await createWeek(otherUserId, {
      newTemplates: [RUN],
    });
    const {templateId} = otherPlan.templates[0];

    await expect(
      createWeek(userId, {
        templates: [{templateId, type: TaskType.DAILY, frequency: 1}],
      }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
    expect(await prisma.plan.count({where: {userId}})).toBe(0);
  });

  it('refuses a step that is done or already on a week', async () => {
    const {steps} = await createProjectWithSteps(userId, 'Course', ['Unit 1']);
    const [step] = steps;
    await moveTasks(userId, [[step.id, TaskStatus.DONE]]);
    await expect(
      createWeek(userId, {newTemplates: [RUN], addProjectStepIds: [step.id]}),
    ).rejects.toThrow(PLANNING_ERROR.PROJECT_STEPS_NOT_UPCOMING([step.id]));
  });

  it("carries over last week's unfinished one-offs and steps by default", async () => {
    const {lastPlan, passport, steps} = await createLastWeek();
    const {plan} = await createWeek(userId, {
      templates: [{...RUN, templateId: await getTemplateId('Run')}],
    });

    expect(plan.periodKey).toBe(NEXT_WEEK_KEY);
    expect(plan.adhocTasks.map(({taskId}) => taskId)).toEqual([passport.id]);
    expect(plan.projectSteps.map(({stepId}) => stepId)).toEqual([steps[0].id]);
    const closedPlan = await prisma.plan.findUniqueOrThrow({
      where: {id: lastPlan.planId},
    });
    expect(closedPlan.status).toBe(PlanStatus.COMPLETED);
  });

  it('returns what it does not carry: one-offs to the matrix, steps to their project', async () => {
    const {passport, steps} = await createLastWeek();
    await createWeek(userId, {
      newTemplates: [newHabit('Stretch', TaskType.DAILY)],
      carryOverAdhocTaskIds: [],
      carryOverProjectStepIds: [],
    });

    // Off any week, back in the backlog of the matrix and the project
    for (const taskId of [passport.id, steps[0].id]) {
      expect(
        await prisma.task.findUniqueOrThrow({
          where: {id: taskId},
          select: {planId: true, status: true},
        }),
      ).toEqual({planId: null, status: TaskStatus.BACKLOG});
    }
  });

  it("refuses to carry a one-off that wasn't on last week", async () => {
    await createLastWeek();
    const loose = await createOneOff(userId, {title: 'Loose end'});
    await expect(
      createWeek(userId, {
        newTemplates: [RUN],
        carryOverAdhocTaskIds: [loose.id],
      }),
    ).rejects.toThrow(PLANNING_ERROR.ADHOC_TASKS_NOT_IN_LAST_PLAN([loose.id]));
  });

  it('refuses a template listed twice', async () => {
    const {lastPlan} = await createLastWeek();
    const [{templateId}] = (await getPlanningContext(userId)).templates;
    await expect(
      createPlanFromSpec(
        userId,
        planSpecSchema.parse({
          templates: [
            {templateId, type: TaskType.DAILY, frequency: 1},
            {templateId, type: TaskType.WEEKLY, frequency: 1},
          ],
        }),
      ),
    ).rejects.toThrow(PLANNING_ERROR.TEMPLATES_LISTED_TWICE([templateId]));
    expect(lastPlan.planId).toBeDefined();
  });
});

/** The id of the user's template with this title. */
const getTemplateId = async (title: string) =>
  (
    await prisma.taskTemplate.findFirstOrThrow({
      where: {userId, title},
      select: {id: true},
    })
  ).id;

describe('patchActivePlan', () => {
  it('removing a habit deletes its unfinished instances and keeps done ones', async () => {
    const {plan} = await createWeek(userId, {newTemplates: [RUN, REVIEW]});
    const reviewId = await getTemplateId('Review');
    const [firstReview] = await prisma.task.findMany({
      where: {userId, templateId: reviewId},
      orderBy: {instanceIndex: 'asc'},
    });
    await moveTasks(userId, [[firstReview.id, TaskStatus.DONE]]);

    const {changes} = await patch({
      planId: plan.planId,
      removeTemplateIds: [reviewId],
    });
    expect(changes.removedTemplates).toEqual([{id: reviewId, title: 'Review'}]);
    expect(await countTasks({templateId: reviewId})).toBe(1);
    expect(
      await countTasks({templateId: reviewId, status: TaskStatus.DONE}),
    ).toBe(1);
  });

  it('a new frequency regenerates the unfinished instances', async () => {
    const {plan} = await createWeek(userId, {newTemplates: [REVIEW]});
    const reviewId = await getTemplateId('Review');
    const [firstReview] = await prisma.task.findMany({
      where: {userId, templateId: reviewId},
      orderBy: {instanceIndex: 'asc'},
    });
    await moveTasks(userId, [[firstReview.id, TaskStatus.DONE]]);

    const {changes, plan: patched} = await patch({
      planId: plan.planId,
      updateTemplates: [{templateId: reviewId, frequency: 3}],
    });
    expect(changes.modifiedTemplates).toEqual([
      {id: reviewId, title: 'Review'},
    ]);
    expect(patched.templates[0]).toMatchObject({frequency: 3, total: 3});
    const instances = await prisma.task.findMany({
      where: {userId, templateId: reviewId},
      orderBy: {instanceIndex: 'asc'},
      select: {instanceIndex: true, status: true},
    });
    expect(instances).toEqual([
      {instanceIndex: 0, status: TaskStatus.DONE},
      {instanceIndex: 1, status: TaskStatus.BACKLOG},
      {instanceIndex: 2, status: TaskStatus.BACKLOG},
    ]);
  });

  it('adds a new habit and an existing one in the same patch', async () => {
    const {plan} = await createWeek(userId, {newTemplates: [RUN, REVIEW]});
    const reviewId = await getTemplateId('Review');
    await patch({planId: plan.planId, removeTemplateIds: [reviewId]});

    const {changes} = await patch({
      planId: plan.planId,
      addTemplates: [
        {templateId: reviewId, type: TaskType.WEEKLY, frequency: 1},
      ],
      newTemplates: [newHabit('Stretch', TaskType.WEEKLY)],
    });
    expect(changes.addedTemplates.map(({title}) => title)).toEqual([
      'Review',
      'Stretch',
    ]);
  });

  it('rejects the whole patch when a template is already on the plan', async () => {
    const {plan} = await createWeek(userId, {newTemplates: [RUN]});
    const runId = await getTemplateId('Run');
    await expect(
      patch({
        planId: plan.planId,
        description: 'Never written',
        addTemplates: [{templateId: runId, type: TaskType.DAILY, frequency: 1}],
      }),
    ).rejects.toThrow(PLANNING_ERROR.TEMPLATES_ALREADY_IN_PLAN([runId]));
    const unchanged = await prisma.plan.findUniqueOrThrow({
      where: {id: plan.planId},
    });
    expect(unchanged.description).toBeNull();
  });

  it("refuses last week's plan id after the week rolled over", async () => {
    const {lastPlan} = await createLastWeek();
    await expect(
      patch({planId: lastPlan.planId, description: 'Too late'}),
    ).rejects.toThrow(PLANNING_ERROR.NO_ACTIVE_PLAN(lastPlan.planId));

    const {plan} = await createWeek(userId, {newTemplates: [RUN]});
    await expect(
      patch({planId: lastPlan.planId, description: 'Too late'}),
    ).rejects.toThrow(
      PLANNING_ERROR.NOT_ACTIVE_PLAN(lastPlan.planId, plan.planId),
    );
  });

  it('sends one-offs back to the matrix and moves steps on and off the week', async () => {
    const {steps} = await createProjectWithSteps(userId, 'Course', [
      'Unit 1',
      'Unit 2',
    ]);
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan} = await createWeek(userId, {
      newTemplates: [RUN],
      addProjectStepIds: [steps[0].id],
    });
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);

    const {changes, plan: patched} = await patch({
      planId: plan.planId,
      removeAdhocTaskIds: [passport.id],
      removeProjectStepIds: [steps[0].id],
      addProjectStepIds: [steps[1].id],
    });
    expect(changes).toMatchObject({
      removedAdhocTasks: [{id: passport.id, title: 'Renew passport'}],
      removedProjectSteps: [{id: steps[0].id, title: 'Unit 1'}],
      addedProjectSteps: [{id: steps[1].id, title: 'Unit 2'}],
    });
    expect(patched.adhocTasks).toEqual([]);
    expect(patched.projectSteps.map(({stepId}) => stepId)).toEqual([
      steps[1].id,
    ]);
  });

  it("refuses a one-off that isn't on the plan", async () => {
    const {plan} = await createWeek(userId, {newTemplates: [RUN]});
    const loose = await createOneOff(userId, {title: 'Loose end'});
    await expect(
      patch({planId: plan.planId, removeAdhocTaskIds: [loose.id]}),
    ).rejects.toThrow(PLANNING_ERROR.ADHOC_TASKS_NOT_IN_PLAN([loose.id]));
  });

  it('changes the description and mode alone', async () => {
    const {plan} = await createWeek(userId, {newTemplates: [RUN]});
    const {plan: patched} = await patch({
      planId: plan.planId,
      description: 'Deep work week',
      mode: PlanMode.EXTREME,
    });
    expect(patched).toMatchObject({
      description: 'Deep work week',
      mode: PlanMode.EXTREME,
    });
  });
});

describe('updateHabit', () => {
  it('renames a habit; instances generated from now on use it', async () => {
    await createWeek(userId, {newTemplates: [RUN]});
    const runId = await getTemplateId('Run');
    const {habit} = await updateHabit(userId, {
      templateId: runId,
      title: 'Morning run',
      size: TaskSize.MEDIUM,
    });
    expect(habit).toMatchObject({title: 'Morning run', points: 3});

    freezeTime(MOMENTS.THURSDAY_NOON);
    await getPlanningContext(userId);
    const thursdayRuns = await prisma.task.findMany({
      where: {userId, forDate: new Date('2026-10-15')},
      select: {title: true, points: true},
    });
    expect(thursdayRuns).toEqual([
      {title: 'Morning run', points: 3},
      {title: 'Morning run', points: 3},
    ]);
  });

  it("refuses a template that isn't the user's", async () => {
    await expect(
      updateHabit(userId, {templateId: newUserId(), title: 'Ghost'}),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
  });
});
