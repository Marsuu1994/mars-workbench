import {beforeEach, describe, expect, it, vi} from 'vitest';
import {prisma} from '@/lib/prisma';
import {PlanStatus} from '@/generated/prisma/client';
import {PlanMode, TaskStatus, TaskType} from '@/utils/enums';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {trackTaskThisWeek} from './matrixService';
import {ensureSynced} from './syncService';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.MONDAY_NOON);
});

const listDailies = () =>
  prisma.task.findMany({
    where: {userId, type: TaskType.DAILY},
    orderBy: [{forDate: 'asc'}, {instanceIndex: 'asc'}],
    select: {forDate: true, status: true},
  });

const createRunWeek = (mode: PlanMode = PlanMode.NORMAL) =>
  createWeek(userId, {
    mode,
    newTemplates: [
      newHabit('Run', TaskType.DAILY, 2),
      newHabit('Review', TaskType.WEEKLY, 1),
    ],
  });

describe('ensureSynced', () => {
  it('returns null for a user with no plan', async () => {
    expect(await ensureSynced(userId)).toBeNull();
  });

  it("expires missed days and generates today's instances", async () => {
    const {plan} = await createRunWeek();
    freezeTime(MOMENTS.WEDNESDAY_NOON);

    expect((await ensureSynced(userId))?.id).toBe(plan.planId);
    const dailies = await listDailies();
    expect(
      dailies.map(({forDate, status}) => [
        forDate?.toISOString().slice(0, 10),
        status,
      ]),
    ).toEqual([
      ['2026-10-12', TaskStatus.EXPIRED],
      ['2026-10-12', TaskStatus.EXPIRED],
      // No Tuesday: nobody opened the app, and missed days aren't backfilled
      ['2026-10-14', TaskStatus.BACKLOG],
      ['2026-10-14', TaskStatus.BACKLOG],
    ]);
  });

  it('writes nothing on a second visit the same day', async () => {
    await createRunWeek();
    freezeTime(MOMENTS.WEDNESDAY_NOON);
    await ensureSynced(userId);

    const transaction = vi.spyOn(prisma, '$transaction');
    await ensureSynced(userId);
    expect(transaction).not.toHaveBeenCalled();
    transaction.mockRestore();
  });

  it('generates no daily instances on a NORMAL weekend, but does in EXTREME', async () => {
    await createRunWeek(PlanMode.NORMAL);
    freezeTime(MOMENTS.SATURDAY_NOON);
    await ensureSynced(userId);
    const saturdayInstances = (await listDailies()).filter(
      ({forDate}) => forDate?.toISOString().slice(0, 10) === '2026-10-17',
    );
    expect(saturdayInstances).toEqual([]);

    const extremeUserId = newUserId();
    freezeTime(MOMENTS.MONDAY_NOON);
    await createWeek(extremeUserId, {
      mode: PlanMode.EXTREME,
      newTemplates: [newHabit('Run', TaskType.DAILY)],
    });
    freezeTime(MOMENTS.SATURDAY_NOON);
    await ensureSynced(extremeUserId);
    expect(
      await prisma.task.count({
        where: {userId: extremeUserId, forDate: new Date('2026-10-17')},
      }),
    ).toBe(1);
  });

  it('closes the week on Monday: habits expire, one-offs and steps wait', async () => {
    const {steps} = await createProjectWithSteps(userId, 'Course', ['Unit 1']);
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan} = await createWeek(userId, {
      newTemplates: [newHabit('Review', TaskType.WEEKLY, 2)],
      addProjectStepIds: [steps[0].id],
    });
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);

    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    expect(await ensureSynced(userId)).toBeNull();

    const closedPlan = await prisma.plan.findUniqueOrThrow({
      where: {id: plan.planId},
    });
    expect(closedPlan.status).toBe(PlanStatus.PENDING_UPDATE);
    const tasks = await prisma.task.findMany({
      where: {userId},
      select: {type: true, status: true, planId: true},
    });
    const statusesOf = (type: TaskType) =>
      tasks.filter(task => task.type === type).map(({status}) => status);
    expect(statusesOf(TaskType.WEEKLY)).toEqual([
      TaskStatus.EXPIRED,
      TaskStatus.EXPIRED,
    ]);
    expect(statusesOf(TaskType.AD_HOC)).toEqual([TaskStatus.TODO]);
    expect(statusesOf(TaskType.PROJECT)).toEqual([TaskStatus.BACKLOG]);
    expect(tasks.every(task => task.planId === plan.planId)).toBe(true);
  });
});
