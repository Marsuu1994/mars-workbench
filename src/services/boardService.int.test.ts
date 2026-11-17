// Spec: design/flows/board.md
import {beforeEach, describe, expect, it} from 'vitest';
import {getBoardTasksByPlanId} from '@/lib/db/tasks';
import {PlanMode, TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  moveTasks,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {fetchBoard, getEmptyBoardState} from './boardService';
import {trackTaskThisWeek} from './matrixService';

/** Wednesday 18:00 in Los Angeles: already Thursday in UTC. */
const WEDNESDAY_EVENING = '2026-10-15T01:00:00Z';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.MONDAY_NOON);
});

/**
 * A NORMAL week created on Monday: a daily run, a weekly review twice, a
 * one-off on the board and a MEDIUM project step in the backlog. All SMALL
 * (2 points) but the step (3).
 */
const createMidWeek = async () => {
  const {steps} = await createProjectWithSteps(userId, 'Course', [
    {title: 'Unit 1', size: TaskSize.MEDIUM},
  ]);
  const passport = await createOneOff(userId, {title: 'Renew passport'});
  const {plan} = await createWeek(userId, {
    mode: PlanMode.NORMAL,
    newTemplates: [
      newHabit('Run', TaskType.DAILY),
      newHabit('Review', TaskType.WEEKLY, 2),
    ],
    addProjectStepIds: [steps[0].id],
  });
  await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
  return plan;
};

describe('fetchBoard', () => {
  it('ST-1 ST-2 is null without an active plan', async () => {
    expect(await fetchBoard(userId)).toBeNull();
  });

  it("ST-3 counts today's and the week's progress", async () => {
    const plan = await createMidWeek();
    freezeTime(WEDNESDAY_EVENING);
    // The first visit on Wednesday generates its run
    await fetchBoard(userId);
    const tasks = await getBoardTasksByPlanId(userId, plan.planId);
    const [run] = tasks.filter(task => task.title === 'Run');
    const [firstReview, secondReview] = tasks.filter(
      task => task.title === 'Review',
    );
    await moveTasks(userId, [
      [run.id, TaskStatus.DONE],
      [firstReview.id, TaskStatus.DONE],
      [secondReview.id, TaskStatus.TODO],
    ]);

    const board = await fetchBoard(userId);
    expect(board?.progress).toEqual({
      // Done this evening in Los Angeles, which is tomorrow in UTC
      todayDoneCount: 2,
      todayDonePoints: 4,
      // Everything off the backlog: run, two reviews, the one-off
      todayTotalCount: 4,
      todayTotalPoints: 8,
      weekDoneCount: 2,
      weekDonePoints: 4,
      // Monday's run (expired) + Wed–Fri's runs + 2 reviews + one-off + step
      weekProjectedCount: 8,
      weekProjectedPoints: 2 + 6 + 4 + 2 + 3,
      daysElapsed: 3,
    });
    expect(board?.projects).toEqual([
      expect.objectContaining({title: 'Course', steps: [expect.any(Object)]}),
    ]);
  });

  it('ST-3 sends the plan with its habits, and every task but the expired ones', async () => {
    const plan = await createMidWeek();
    freezeTime(WEDNESDAY_EVENING);

    const board = await fetchBoard(userId);
    expect(board?.plan).toEqual({
      periodKey: plan.periodKey,
      mode: PlanMode.NORMAL,
      planTemplates: expect.arrayContaining([
        expect.objectContaining({type: TaskType.DAILY, frequency: 1}),
        expect.objectContaining({type: TaskType.WEEKLY, frequency: 2}),
      ]),
    });
    // Monday's run has expired; Wednesday's is generated on this visit
    const runs = board?.tasks.filter(task => task.title === 'Run') ?? [];
    expect(runs).toHaveLength(1);
    expect(runs[0].status).not.toBe(TaskStatus.EXPIRED);
    expect(board?.tasks.map(task => task.title).sort()).toEqual([
      'Renew passport',
      'Review',
      'Review',
      'Run',
      'Unit 1',
    ]);
  });

  it("ST-3 draws each step card's whole path, for this week's projects only", async () => {
    const {steps} = await createProjectWithSteps(userId, 'Course', [
      'Unit 1',
      'Unit 2',
      'Unit 3',
    ]);
    await createProjectWithSteps(userId, 'Book', ['Part 1']);
    await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
      addProjectStepIds: [steps[1].id],
    });

    const board = await fetchBoard(userId);

    expect(board?.projects).toEqual([
      {
        id: expect.any(String),
        title: 'Course',
        steps: steps.map(({id, instanceIndex}) => ({
          id,
          status: TaskStatus.BACKLOG,
          instanceIndex,
        })),
      },
    ]);
  });

  it("doesn't count yesterday evening's work as today's", async () => {
    const plan = await createMidWeek();
    // Tuesday 18:00 in Los Angeles, Wednesday 01:00 UTC
    freezeTime('2026-10-14T01:00:00Z');
    const tasks = await getBoardTasksByPlanId(userId, plan.planId);
    const [firstReview] = tasks.filter(task => task.title === 'Review');
    await moveTasks(userId, [[firstReview.id, TaskStatus.DONE]]);

    freezeTime(MOMENTS.WEDNESDAY_NOON);
    const board = await fetchBoard(userId);
    expect(board?.progress).toMatchObject({
      todayDoneCount: 0,
      weekDoneCount: 1,
    });
  });
});

describe('getEmptyBoardState', () => {
  it('ST-1 greets a new user', async () => {
    expect(await getEmptyBoardState(userId)).toEqual({kind: 'new'});
  });

  it("ST-2 recaps a returning user's finished week over every kind of task", async () => {
    const plan = await createMidWeek();
    const tasks = await getBoardTasksByPlanId(userId, plan.planId);
    const [firstReview] = tasks.filter(task => task.title === 'Review');
    const [step] = tasks.filter(task => task.title === 'Unit 1');
    await moveTasks(userId, [
      [firstReview.id, TaskStatus.DONE],
      [step.id, TaskStatus.DONE],
    ]);

    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    expect(await fetchBoard(userId)).toBeNull();
    expect(await getEmptyBoardState(userId)).toEqual({
      kind: 'returning',
      recap: {
        // Monday's run (expired), the two reviews, the step and the one-off
        // (still in Todo); one review (2) and the step (3) done
        doneCount: 2,
        totalCount: 5,
        donePoints: 5,
        completionRate: 2 / 5,
      },
    });
  });
});
