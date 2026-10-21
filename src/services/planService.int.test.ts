import {beforeEach, describe, expect, it} from 'vitest';
import {prisma} from '@/lib/prisma';
import {planPatchSchema} from '@/schemas';
import {PeriodType, PlanMode, TaskStatus, TaskType} from '@/utils/enums';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {trackTaskThisWeek} from './matrixService';
import {createPlan, updatePlan} from './planService';
import {getPlanningContext, patchActivePlan} from './planningService';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

/** The plan form's view of the active plan: its full template list. */
const readFormTemplates = async () => {
  const {activePlan} = await getPlanningContext(userId);
  return activePlan!.templates.map(({templateId, type, frequency}) => ({
    templateId,
    type,
    frequency,
  }));
};

describe('createPlan (plan form)', () => {
  it('creates the week from existing templates, one-offs and steps', async () => {
    // Last week leaves templates behind to pick from
    freezeTime(MOMENTS.MONDAY_NOON);
    await createWeek(userId, {newTemplates: [newHabit('Run', TaskType.DAILY)]});
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    const [{templateId}] = (await getPlanningContext(userId)).templates;
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {steps} = await createProjectWithSteps(userId, 'Course', ['Unit 1']);

    const plan = await createPlan(userId, {
      periodType: PeriodType.WEEKLY,
      mode: PlanMode.EXTREME,
      templates: [{templateId, type: TaskType.DAILY, frequency: 1}],
      adhocTaskIds: [passport.id],
      projectStepIds: [steps[0].id],
    });
    expect(plan).toMatchObject({mode: PlanMode.EXTREME});

    const planId = 'id' in plan ? plan.id : '';
    expect(
      await prisma.task.findMany({
        where: {userId, planId},
        select: {type: true},
        orderBy: {type: 'asc'},
      }),
    ).toEqual([
      {type: TaskType.DAILY},
      {type: TaskType.AD_HOC},
      {type: TaskType.PROJECT},
    ]);
  });

  it('answers the form with an error while a plan is active', async () => {
    await createWeek(userId, {newTemplates: [newHabit('Run', TaskType.DAILY)]});
    const [{templateId}] = await readFormTemplates();
    expect(
      await createPlan(userId, {
        periodType: PeriodType.WEEKLY,
        mode: PlanMode.NORMAL,
        templates: [{templateId, type: TaskType.DAILY, frequency: 1}],
      }),
    ).toEqual({
      error: {formErrors: ['An active plan already exists'], fieldErrors: {}},
    });
  });
});

describe('updatePlan (plan form)', () => {
  it('lets go of exactly the one-offs the form unticked', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const landlord = await createOneOff(userId, {title: 'Reply to landlord'});
    const {plan} = await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
    });
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
    // Tracked from the matrix while the form was open
    await trackTaskThisWeek(userId, landlord.id, TaskStatus.TODO);

    await updatePlan(userId, plan.planId, {removeAdhocTaskIds: [passport.id]});

    const onPlan = await prisma.task.findMany({
      where: {userId, planId: plan.planId, type: TaskType.AD_HOC},
      select: {id: true},
    });
    expect(onPlan).toEqual([{id: landlord.id}]);
  });

  it('saves a description or mode alone', async () => {
    const {plan} = await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
    });
    expect(
      await updatePlan(userId, plan.planId, {
        description: 'Light week',
        mode: PlanMode.EXTREME,
      }),
    ).toEqual({diff: {added: [], removed: [], modified: []}});
    expect(
      await prisma.plan.findUniqueOrThrow({
        where: {id: plan.planId},
        select: {description: true, mode: true},
      }),
    ).toEqual({description: 'Light week', mode: PlanMode.EXTREME});
  });

  it("answers the form with an error for another user's plan", async () => {
    const {plan} = await createWeek(newUserId(), {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
    });
    expect(await updatePlan(userId, plan.planId, {description: 'x'})).toEqual({
      error: {formErrors: ['Plan not found'], fieldErrors: {}},
    });
  });

  // Known bug (tracker › Plan › Medium): the form saves its full template
  // list, so a habit Claude changes while the form is open is reverted. Flip
  // to `it` when it's fixed.
  it.fails(
    'keeps a habit change Claude made while the form was open',
    async () => {
      const {plan} = await createWeek(userId, {
        newTemplates: [newHabit('Review', TaskType.WEEKLY, 1)],
      });
      const formTemplates = await readFormTemplates();
      const [{templateId}] = formTemplates;
      await patchActivePlan(
        userId,
        planPatchSchema.parse({
          planId: plan.planId,
          updateTemplates: [{templateId, frequency: 3}],
        }),
      );

      await updatePlan(userId, plan.planId, {templates: formTemplates});

      const [review] = await readFormTemplates();
      expect(review.frequency).toBe(3);
    },
  );
});
