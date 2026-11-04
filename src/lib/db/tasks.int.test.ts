import {beforeEach, describe, expect, it} from 'vitest';
import {PlanMode, PriorityQuadrant, TaskStatus, TaskType} from '@/utils/enums';
import {completeMatrixTask} from '@/services/matrixService';
import {
  createOneOff,
  createWeek,
  newHabit,
  newUserId,
} from '../../../test/factories';
import {MOMENTS, freezeTime} from '../../../test/time';
import {
  getBoardTasksByPlanId,
  updateAdhocTaskQuadrants,
  updateTaskStatus,
} from './tasks';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.MONDAY_NOON);
});

/** A week with one weekly review, waiting in the backlog. */
const createReviewInBacklog = async () => {
  const {plan} = await createWeek(userId, {
    mode: PlanMode.NORMAL,
    newTemplates: [newHabit('Review', TaskType.WEEKLY)],
  });
  const [review] = await getBoardTasksByPlanId(userId, plan.planId);
  return review;
};

describe('updateTaskStatus: board moves are forward-only', () => {
  it('pulls a backlog card into Todo, then finishes it', async () => {
    const review = await createReviewInBacklog();

    const todo = await updateTaskStatus(userId, review.id, TaskStatus.TODO);
    expect(todo).toMatchObject({status: TaskStatus.TODO, doneAt: null});

    const done = await updateTaskStatus(userId, review.id, TaskStatus.DONE);
    expect(done?.status).toBe(TaskStatus.DONE);
    expect(done?.doneAt).toBeInstanceOf(Date);
  });

  it('finishes a backlog card straight away', async () => {
    const review = await createReviewInBacklog();

    const done = await updateTaskStatus(userId, review.id, TaskStatus.DONE);
    expect(done?.status).toBe(TaskStatus.DONE);
  });

  it('never moves a card out of Done, nor re-dates it', async () => {
    const review = await createReviewInBacklog();
    const done = await updateTaskStatus(userId, review.id, TaskStatus.DONE);

    expect(await updateTaskStatus(userId, review.id, TaskStatus.TODO)).toBe(
      null,
    );
    expect(await updateTaskStatus(userId, review.id, TaskStatus.DONE)).toBe(
      null,
    );
    const [stored] = await getBoardTasksByPlanId(userId, review.planId!);
    expect(stored).toMatchObject({
      status: TaskStatus.DONE,
      doneAt: done?.doneAt,
    });
  });

  it('never moves a one-off still on the matrix', async () => {
    const passport = await createOneOff(userId, {title: 'Renew passport'});

    expect(await updateTaskStatus(userId, passport.id, TaskStatus.TODO)).toBe(
      null,
    );
    expect(await updateTaskStatus(userId, passport.id, TaskStatus.DONE)).toBe(
      null,
    );
  });
});

describe('updateAdhocTaskQuadrants: only unfinished one-offs move', () => {
  it('moves a one-off to another quadrant', async () => {
    const passport = await createOneOff(userId, {
      title: 'Renew passport',
      quadrant: PriorityQuadrant.SCHEDULE,
    });
    const [moved] = await updateAdhocTaskQuadrants(
      userId,
      [passport.id],
      PriorityQuadrant.DO_FIRST,
    );
    expect(moved?.quadrant).toBe(PriorityQuadrant.DO_FIRST);
  });

  it('leaves a completed one-off where it was', async () => {
    const passport = await createOneOff(userId, {
      title: 'Renew passport',
      quadrant: PriorityQuadrant.SCHEDULE,
    });
    await completeMatrixTask(userId, passport.id);

    expect(
      await updateAdhocTaskQuadrants(
        userId,
        [passport.id],
        PriorityQuadrant.DO_FIRST,
      ),
    ).toEqual([]);
  });
});
