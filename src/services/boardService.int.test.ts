// Spec: design/specs/board.md
import {beforeEach, describe, expect, it} from 'vitest';
import {getBoardTasksByPlanId} from '@/lib/db/tasks';
import {planPatchSchema} from '@/schemas';
import {PlanMode, TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  endWeek,
  moveTasks,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {fetchBoard, getEmptyBoardState} from './boardService';
import {trackTaskThisWeek} from './matrixService';
import {patchActivePlan} from './planningService';

/** Wednesday 18:00 in Los Angeles: already Thursday in UTC. */
const WEDNESDAY_EVENING = '2026-10-15T01:00:00Z';
/** Monday, a few hours after noon. */
const MONDAY_EVENING = '2026-10-13T01:00:00Z';
/** Next Monday, a few hours after noon. */
const NEXT_MONDAY_EVENING = '2026-10-20T01:00:00Z';

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

  it("ST-4 RING-2 sends each past day's daily habit tasks that expired undone, whether they were left in the backlog or in Todo", async () => {
    const plan = await createMidWeek();
    // Tuesday's visit expires Monday's run, which never left the backlog, and
    // generates Tuesday's, which is pulled into Todo and left there
    freezeTime('2026-10-13T19:00:00Z');
    await fetchBoard(userId);
    const [tuesdayRun] = (
      await getBoardTasksByPlanId(userId, plan.planId)
    ).filter(task => task.title === 'Run');
    await moveTasks(userId, [[tuesdayRun.id, TaskStatus.TODO]]);
    // Wednesday's visit expires Tuesday's too
    freezeTime(WEDNESDAY_EVENING);
    await fetchBoard(userId);
    const tasks = await getBoardTasksByPlanId(userId, plan.planId);
    const [run] = tasks.filter(task => task.title === 'Run');
    const [review] = tasks.filter(task => task.title === 'Review');
    await moveTasks(userId, [
      [run.id, TaskStatus.DONE],
      [review.id, TaskStatus.TODO],
    ]);

    const board = await fetchBoard(userId);
    // Monday's and Tuesday's runs; today's run is done, and a weekly habit
    // task doesn't expire mid-week
    expect(board?.expiredDailyCountByDate).toEqual({
      '2026-10-12': 1,
      '2026-10-13': 1,
    });
    expect(board).not.toHaveProperty('progress');
    expect(board?.projects).toEqual([
      expect.objectContaining({title: 'Course', steps: [expect.any(Object)]}),
    ]);
  });

  it('ST-4 sends the plan with its habits, and every task but the expired ones', async () => {
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

  it('BL-16 sends the habits in the order they were created, not the order they joined the plan', async () => {
    // Last week made Stretch; this week makes Journal, then adds Stretch back
    const {plan: lastWeek} = await createWeek(userId, {
      newTemplates: [newHabit('Stretch', TaskType.WEEKLY)],
    });
    const [stretch] = lastWeek.templates;
    await endWeek(userId, lastWeek.planId);
    freezeTime(MOMENTS.NEXT_MONDAY_NOON);
    const {plan: thisWeek} = await createWeek(userId, {
      newTemplates: [newHabit('Journal', TaskType.WEEKLY)],
    });
    const [journal] = thisWeek.templates;
    freezeTime(NEXT_MONDAY_EVENING);
    await patchActivePlan(
      userId,
      planPatchSchema.parse({
        planId: thisWeek.planId,
        addTemplates: [
          {templateId: stretch.templateId, type: TaskType.WEEKLY, frequency: 1},
        ],
      }),
    );

    const board = await fetchBoard(userId);

    expect(board?.plan.planTemplates.map(({templateId}) => templateId)).toEqual(
      [stretch.templateId, journal.templateId],
    );
  });

  it('BL-16 sends the projects in the order they were created, not by title', async () => {
    const zed = await createProjectWithSteps(userId, 'Zed course', ['Unit 1']);
    freezeTime(MONDAY_EVENING);
    const alpha = await createProjectWithSteps(userId, 'Alpha course', [
      'Unit 1',
    ]);
    await createWeek(userId, {
      addProjectStepIds: [alpha.steps[0].id, zed.steps[0].id],
    });

    const board = await fetchBoard(userId);

    expect(board?.projects.map(({title}) => title)).toEqual([
      'Zed course',
      'Alpha course',
    ]);
  });

  it('BL-16 breaks a tie between habits or projects created at the same moment by their id', async () => {
    // The clock is frozen: the projects, and the habits, share a creation time.
    // Six of each, so a broken tiebreak can't match id order by chance
    const titles = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
    const projects = [];
    for (const title of titles) {
      projects.push(await createProjectWithSteps(userId, title, ['Step 1']));
    }
    const {plan} = await createWeek(userId, {
      newTemplates: titles.map(title => newHabit(title, TaskType.WEEKLY)),
      addProjectStepIds: projects.map(({steps}) => steps[0].id),
    });

    const board = await fetchBoard(userId);

    const byId = (ids: string[]) => [...ids].sort();
    const templateIds = plan.templates.map(({templateId}) => templateId);
    expect(board?.plan.planTemplates.map(({templateId}) => templateId)).toEqual(
      byId(templateIds),
    );
    expect(board?.projects.map(({id}) => id)).toEqual(
      byId(projects.map(({id}) => id)),
    );
  });

  it("ST-4 draws each step card's whole path, for this week's projects only", async () => {
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
