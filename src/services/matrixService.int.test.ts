import {beforeEach, describe, expect, it} from 'vitest';
import {TaskStatus, TaskType} from '@/utils/enums';
import {
  createOneOff,
  createWeek,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {
  completeMatrixTask,
  fetchPriorityMatrix,
  trackTaskThisWeek,
  undoCompleteMatrixTask,
} from './matrixService';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

const createActiveWeek = () =>
  createWeek(userId, {newTemplates: [newHabit('Run', TaskType.DAILY)]});

describe('fetchPriorityMatrix', () => {
  it("lists the user's open one-offs and this week's plan", async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    await createOneOff(newUserId(), {title: "Someone else's"});
    const {plan} = await createActiveWeek();

    expect(await fetchPriorityMatrix(userId)).toEqual({
      tasks: [expect.objectContaining({id: passport.id})],
      activePlan: {id: plan.planId, periodKey: plan.periodKey},
    });
  });

  it("doesn't offer last week's plan once the week is over", async () => {
    await createActiveWeek();
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    expect((await fetchPriorityMatrix(userId)).activePlan).toBeNull();
  });
});

describe('trackTaskThisWeek', () => {
  it('needs an active plan', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    expect(
      await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO),
    ).toEqual({error: 'noActivePlan'});
  });

  it('puts the one-off on the board', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan} = await createActiveWeek();
    expect(
      await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO),
    ).toMatchObject({task: {planId: plan.planId, status: TaskStatus.TODO}});
  });

  it("refuses another user's one-off", async () => {
    const theirs = await createOneOff(newUserId(), {title: 'Not yours'});
    await createActiveWeek();
    expect(await trackTaskThisWeek(userId, theirs.id, TaskStatus.TODO)).toEqual(
      {error: 'taskNotFound'},
    );
  });
});

describe('completing from the matrix', () => {
  it("credits an unassigned one-off to this week's plan, and undo detaches it", async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan} = await createActiveWeek();

    expect(await completeMatrixTask(userId, passport.id)).toMatchObject({
      task: {status: TaskStatus.DONE, planId: plan.planId},
    });
    const undone = await undoCompleteMatrixTask(userId, passport.id, {
      status: TaskStatus.BACKLOG,
      detach: true,
    });
    expect(undone).toMatchObject({
      task: {status: TaskStatus.BACKLOG, planId: null, doneAt: null},
    });
  });

  it('closes a one-off with no plan at all', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    expect(await completeMatrixTask(userId, passport.id)).toMatchObject({
      task: {status: TaskStatus.DONE, planId: null},
    });
  });

  it('undo keeps a tracked one-off on the board', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    const {plan} = await createActiveWeek();
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
    await completeMatrixTask(userId, passport.id);

    expect(
      await undoCompleteMatrixTask(userId, passport.id, {
        status: TaskStatus.TODO,
        detach: false,
      }),
    ).toMatchObject({task: {status: TaskStatus.TODO, planId: plan.planId}});
  });
});
