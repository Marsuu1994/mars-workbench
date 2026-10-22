import {beforeEach, describe, expect, it} from 'vitest';
import {prisma} from '@/lib/prisma';
import {oneOffTasksPatchSchema, oneOffTasksSpecSchema} from '@/schemas';
import {PriorityQuadrant, TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {PLANNING_ERROR} from '@/utils/errorMessages';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {trackTaskThisWeek} from './matrixService';
import {createOneOffTasks, patchOneOffTasks} from './oneOffPlanningService';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

const create = (input: Parameters<typeof oneOffTasksSpecSchema.parse>[0]) =>
  createOneOffTasks(userId, oneOffTasksSpecSchema.parse(input));

const patch = (input: Parameters<typeof oneOffTasksPatchSchema.parse>[0]) =>
  patchOneOffTasks(userId, oneOffTasksPatchSchema.parse(input));

const createActiveWeek = () =>
  createWeek(userId, {newTemplates: [newHabit('Run', TaskType.DAILY)]});

const readTask = (taskId: string) =>
  prisma.task.findUniqueOrThrow({
    where: {id: taskId},
    select: {planId: true, status: true, quadrant: true, doneAt: true},
  });

describe('createOneOffTasks', () => {
  it('adds the tasks to the matrix, on no week, in the order given', async () => {
    await createActiveWeek();
    const {oneOffTasks} = await create({
      tasks: [
        {
          title: 'Renew passport',
          description: 'Expires in March',
          size: TaskSize.SMALL,
          quadrant: PriorityQuadrant.SCHEDULE,
        },
        {
          title: 'Book dentist',
          size: TaskSize.EXTRA_SMALL,
          quadrant: PriorityQuadrant.DO_FIRST,
        },
        {
          title: 'Clean the garage',
          size: TaskSize.MEDIUM,
          quadrant: PriorityQuadrant.SCHEDULE,
        },
      ],
    });

    expect(oneOffTasks).toEqual([
      {
        taskId: expect.any(String),
        title: 'Renew passport',
        description: 'Expires in March',
        size: TaskSize.SMALL,
        points: 2,
        quadrant: PriorityQuadrant.SCHEDULE,
        state: 'UNTRACKED',
        createdOn: '2026-10-14',
      },
      expect.objectContaining({title: 'Book dentist', description: null}),
      expect.objectContaining({title: 'Clean the garage', points: 3}),
    ]);
    // The matrix (oldest first) lists a quadrant's new tasks in that order too
    const scheduled = await prisma.task.findMany({
      where: {userId, quadrant: PriorityQuadrant.SCHEDULE},
      orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
      select: {title: true, type: true, status: true, planId: true},
    });
    expect(scheduled).toEqual(
      ['Renew passport', 'Clean the garage'].map(title => ({
        title,
        type: TaskType.AD_HOC,
        status: TaskStatus.BACKLOG,
        planId: null,
      })),
    );
  });

  it('takes at most 20 tasks in a call', () => {
    const task = {
      title: 'Errand',
      size: TaskSize.SMALL,
      quadrant: PriorityQuadrant.SCHEDULE,
    };
    expect(
      oneOffTasksSpecSchema.safeParse({tasks: Array(21).fill(task)}).success,
    ).toBe(false);
    expect(oneOffTasksSpecSchema.safeParse({tasks: []}).success).toBe(false);
  });
});

describe('patchOneOffTasks', () => {
  it("credits a one-off on no week to this week's plan, as the matrix does", async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan} = await createActiveWeek();

    const {completedTasks, reprioritizedTasks} = await patch({
      completeTaskIds: [passport.id],
    });

    expect(completedTasks).toEqual([
      expect.objectContaining({taskId: passport.id, state: 'DONE'}),
    ]);
    expect(reprioritizedTasks).toEqual([]);
    expect(await readTask(passport.id)).toMatchObject({
      planId: plan.planId,
      status: TaskStatus.DONE,
      doneAt: new Date(MOMENTS.WEDNESDAY_NOON),
    });
  });

  it('completes a one-off on no plan when the week has none', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    await patch({completeTaskIds: [passport.id]});
    expect(await readTask(passport.id)).toMatchObject({
      planId: null,
      status: TaskStatus.DONE,
    });
  });

  it("keeps a tracked one-off on this week's plan", async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan} = await createActiveWeek();
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);

    await patch({completeTaskIds: [passport.id]});
    expect(await readTask(passport.id)).toMatchObject({
      planId: plan.planId,
      status: TaskStatus.DONE,
    });
  });

  it("keeps a one-off left on last week's plan there", async () => {
    freezeTime(MOMENTS.MONDAY_NOON);
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan: lastPlan} = await createActiveWeek();
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);

    const {completedTasks} = await patch({completeTaskIds: [passport.id]});
    expect(completedTasks).toEqual([
      expect.objectContaining({taskId: passport.id, state: 'DONE'}),
    ]);
    expect(await readTask(passport.id)).toMatchObject({
      planId: lastPlan.planId,
      status: TaskStatus.DONE,
    });
  });

  it('moves one-offs between quadrants without touching their week', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const garage = await createOneOff(userId, {title: 'Clean the garage'});
    const {plan} = await createActiveWeek();
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);

    const {reprioritizedTasks} = await patch({
      reprioritizeTasks: [
        {taskId: garage.id, quadrant: PriorityQuadrant.MAYBE_LATER},
        {taskId: passport.id, quadrant: PriorityQuadrant.SCHEDULE},
      ],
    });

    expect(reprioritizedTasks).toEqual([
      expect.objectContaining({
        taskId: garage.id,
        quadrant: PriorityQuadrant.MAYBE_LATER,
        state: 'UNTRACKED',
      }),
      expect.objectContaining({
        taskId: passport.id,
        quadrant: PriorityQuadrant.SCHEDULE,
        state: 'THIS_WEEK',
      }),
    ]);
    expect(await readTask(passport.id)).toMatchObject({
      planId: plan.planId,
      status: TaskStatus.TODO,
    });
  });

  it("refuses ids that aren't the user's unfinished one-offs, and writes nothing", async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const done = await createOneOff(userId, {title: 'Book dentist'});
    await patch({completeTaskIds: [done.id]});
    const theirs = await createOneOff(newUserId(), {title: 'Not yours'});
    const {steps} = await createProjectWithSteps(userId, 'Course', ['Unit 1']);
    const foreignIds = [done.id, theirs.id, steps[0].id];

    await expect(
      patch({
        completeTaskIds: [passport.id, ...foreignIds],
        reprioritizeTasks: [
          {taskId: passport.id, quadrant: PriorityQuadrant.MAYBE_LATER},
        ],
      }),
    ).rejects.toThrow(
      PLANNING_ERROR.PATCH_REJECTED([
        PLANNING_ERROR.ONE_OFF_TASKS_NOT_FOUND(foreignIds),
        PLANNING_ERROR.ONE_OFF_TASKS_LISTED_TWICE([passport.id]),
      ]),
    );
    expect(await readTask(passport.id)).toMatchObject({
      status: TaskStatus.BACKLOG,
      quadrant: PriorityQuadrant.DO_FIRST,
    });
  });

  it('refuses a patch that changes nothing', () => {
    expect(oneOffTasksPatchSchema.safeParse({}).success).toBe(false);
  });
});
