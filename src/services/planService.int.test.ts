import {beforeEach, describe, expect, it} from 'vitest';
import {prisma} from '@/lib/prisma';
import {planPatchSchema, updatePlanSchema} from '@/schemas';
import {
  PeriodType,
  PlanMode,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/utils/enums';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  moveTasksByTitle,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {completeMatrixTask, trackTaskThisWeek} from './matrixService';
import {
  countIncompleteInstancesByTemplateId,
  createPlan,
  createTemplate,
  fetchEditPlanForm,
  fetchNewPlanForm,
  updatePlan,
  updateTemplate,
} from './planService';
import {getPlanningContext, patchActivePlan} from './planningService';
import {archiveProject} from './projectService';

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

describe('fetchNewPlanForm / fetchEditPlanForm (plan form pages)', () => {
  it('seeds a new week from the ended plan: its habits, one-offs and steps', async () => {
    freezeTime(MOMENTS.MONDAY_NOON);
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    // Never tracked: it stays on the matrix, out of the carry-over
    await createOneOff(userId, {title: 'Sort old photos'});
    const {steps} = await createProjectWithSteps(userId, 'Course', [
      'Unit 1',
      'Unit 2',
    ]);
    const {plan} = await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
      addProjectStepIds: [steps[0].id],
    });
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);

    const form = await fetchNewPlanForm(userId);

    expect(form.plan?.id).toBe(plan.planId);
    expect(form.plan?.planTemplates.map(({type}) => type)).toEqual([
      TaskType.DAILY,
    ]);
    expect(form.templates.map(({title}) => title)).toEqual(['Run']);
    expect(form.adhocTasks.map(({id}) => id)).toEqual([passport.id]);
    expect(form.projectSteps.map(({id}) => id)).toEqual([steps[0].id]);
  });

  it('starts a new week from scratch when no plan has ended', async () => {
    await createOneOff(userId, {title: 'Renew passport'});
    expect(await fetchNewPlanForm(userId)).toEqual({
      templates: [],
      plan: null,
      adhocTasks: [],
      projectSteps: [],
    });
  });

  it("edits a plan with its own one-offs; another user's plan is not found", async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    await createOneOff(userId, {title: 'Sort old photos'});
    const {plan} = await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
    });
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);

    const form = await fetchEditPlanForm(userId, plan.planId);

    expect(form?.plan.id).toBe(plan.planId);
    expect(form?.adhocTasks.map(({id}) => id)).toEqual([passport.id]);
    expect(await fetchEditPlanForm(newUserId(), plan.planId)).toBeNull();
  });
});

describe('createPlan (plan form)', () => {
  it('creates the week from existing templates, one-offs and steps', async () => {
    // Last week leaves a template, a one-off and a step behind to carry over
    freezeTime(MOMENTS.MONDAY_NOON);
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {steps} = await createProjectWithSteps(userId, 'Course', ['Unit 1']);
    await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
      addProjectStepIds: [steps[0].id],
    });
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    const [{templateId}] = (await getPlanningContext(userId)).templates;

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

  it("carries only last week's unfinished one-offs and steps; any other id stays where it is", async () => {
    freezeTime(MOMENTS.MONDAY_NOON);
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const dentist = await createOneOff(userId, {title: 'Book the dentist'});
    const photos = await createOneOff(userId, {title: 'Sort old photos'});
    const course = await createProjectWithSteps(userId, 'Course', ['Unit 1']);
    const book = await createProjectWithSteps(userId, 'Book', ['Chapter 1']);
    const {plan: lastWeek} = await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.WEEKLY)],
      addProjectStepIds: [course.steps[0].id],
    });
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
    await trackTaskThisWeek(userId, dentist.id, TaskStatus.TODO);
    await archiveProject(userId, book.id);
    const [run] = await prisma.task.findMany({
      where: {userId, planId: lastWeek.planId, type: TaskType.WEEKLY},
      select: {id: true},
    });

    // The form loads, then the dentist is completed on the matrix
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    await completeMatrixTask(userId, dentist.id);
    const completed = await prisma.task.findUniqueOrThrow({
      where: {id: dentist.id},
      select: {doneAt: true},
    });

    const plan = await createPlan(userId, {
      periodType: PeriodType.WEEKLY,
      mode: PlanMode.NORMAL,
      templates: [],
      adhocTaskIds: [passport.id, dentist.id, photos.id, run.id],
      projectStepIds: [course.steps[0].id, book.steps[0].id],
    });
    const planId = 'id' in plan ? plan.id : '';

    const readTask = (id: string) =>
      prisma.task.findUniqueOrThrow({
        where: {id},
        select: {planId: true, status: true, doneAt: true},
      });
    expect(await readTask(passport.id)).toMatchObject({planId});
    expect(await readTask(course.steps[0].id)).toMatchObject({planId});
    // Completed after the form loaded: its points stay on last week
    expect(await readTask(dentist.id)).toEqual({
      planId: lastWeek.planId,
      status: TaskStatus.DONE,
      doneAt: completed.doneAt,
    });
    expect(await readTask(photos.id)).toMatchObject({planId: null});
    expect(await readTask(run.id)).toMatchObject({planId: lastWeek.planId});
    expect(await readTask(book.steps[0].id)).toMatchObject({planId: null});
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
    ).toEqual({error: 'activePlanExists'});
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
      error: 'planNotActive',
    });
  });

  it('clears the description when the form sends it empty', async () => {
    const {plan} = await createWeek(userId, {
      description: 'Light week',
      newTemplates: [newHabit('Run', TaskType.DAILY)],
    });
    await updatePlan(userId, plan.planId, {description: ''});
    expect(
      await prisma.plan.findUniqueOrThrow({
        where: {id: plan.planId},
        select: {description: true},
      }),
    ).toEqual({description: null});
  });

  it("changes nothing once the plan's week has ended, nor an older plan", async () => {
    freezeTime(MOMENTS.MONDAY_NOON);
    const {plan: lastWeek} = await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.WEEKLY)],
    });
    const [run] = await readFormTemplates();
    const readLastWeek = () =>
      prisma.task.findMany({
        where: {planId: lastWeek.planId},
        select: {id: true, status: true},
      });

    // The form was left open across the week's end
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    expect(await fetchEditPlanForm(userId, lastWeek.planId)).toBeNull();
    const before = await readLastWeek();
    const save = () =>
      updatePlan(
        userId,
        lastWeek.planId,
        updatePlanSchema.parse({
          description: 'Too late',
          templates: [{...run, frequency: 3}],
        }),
      );
    expect(await save()).toEqual({error: 'planNotActive'});

    // Once the new week has its plan, last week's is completed: still locked
    await createWeek(userId, {
      newTemplates: [newHabit('Read', TaskType.DAILY)],
    });
    expect(await save()).toEqual({error: 'planNotActive'});

    expect(await readLastWeek()).toEqual(before);
    expect(
      await prisma.plan.findUniqueOrThrow({
        where: {id: lastWeek.planId},
        select: {description: true},
      }),
    ).toEqual({description: null});
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

      await updatePlan(
        userId,
        plan.planId,
        updatePlanSchema.parse({templates: formTemplates}),
      );

      const [review] = await readFormTemplates();
      expect(review.frequency).toBe(3);
    },
  );
});

describe('task templates (plan form)', () => {
  it("edits the user's own template; another user's is not found", async () => {
    const template = await createTemplate(userId, {
      title: 'Run',
      description: 'Easy pace',
      size: TaskSize.SMALL,
    });

    expect(
      await updateTemplate(userId, template.id, {title: 'Long run'}),
    ).toEqual({success: true});
    expect(
      await updateTemplate(newUserId(), template.id, {title: 'Taken'}),
    ).toEqual({error: 'templateNotFound'});
  });

  it("counts each template's unfinished instances for the review", async () => {
    const {plan} = await createWeek(userId, {
      newTemplates: [newHabit('Review', TaskType.WEEKLY, 3)],
    });
    const [{templateId}] = await readFormTemplates();
    await moveTasksByTitle(userId, plan.planId, [['Review', TaskStatus.DONE]]);

    expect(
      await countIncompleteInstancesByTemplateId(userId, plan.planId, [
        templateId,
      ]),
    ).toEqual({[templateId]: 2});
  });
});
