// Spec: design/flows/board.md
/**
 * The board's journeys, each step named by the action it takes. What each
 * screen shows is held by the component tests next to the board's
 * components; here every journey runs end to end on its own seeded user.
 */
import {newHabit} from '../test/factories';
import {
  PlanMode,
  SIZE_TO_POINTS,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/utils/enums';
import {
  dragCardWithKeyboard,
  findBacklogCard,
  findBacklogCount,
  findBoardCard,
  findCardOf,
  findColumnCount,
  findTopCardTitle,
  openBacklog,
  readMarkFills,
  readProgress,
  type Progress,
} from './actions/board';
import {
  expect,
  openPage,
  test,
  waitForServerAction,
  type Seed,
} from './fixtures';

const HABIT_TITLE = 'Flashcards';
const PROJECT_TITLE = 'Spanish course';
const STEP_TITLE = 'Unit 1 — Daily routines';
const NEXT_STEP_TITLE = 'Unit 2 — At the market';
/** A small task's points: every task these journeys seed is small. */
const TASK_POINTS = SIZE_TO_POINTS[TaskSize.SMALL];
/** An EXTREME week runs a daily habit every day. */
const EXTREME_WEEK_DAYS = 7;
const BACKLOG_EMPTY_MESSAGE = "You're all caught up — no staged tasks.";
/** Where Start a plan leads, wherever the app is served. */
const PLAN_PAGE = /\/kanban\/plans\/new$/;

test('J1 a new user starts their first plan', async ({page}) => {
  const startPlan = page.getByRole('link', {name: 'Create your first plan'});

  await test.step('ST-1 the empty board asks for a first plan', async () => {
    await openPage(page, '/kanban');
    await expect(startPlan).toBeVisible();
  });

  await test.step('A1 start a plan', async () => {
    await startPlan.click();
    await page.waitForURL(PLAN_PAGE);
  });
});

test("J2 a returning user sees last week's recap and starts this week's plan", async ({
  page,
  seed,
}) => {
  // Last week: a habit that ran twice, done once
  const {plan} = await seed.createWeek({
    mode: PlanMode.NORMAL,
    newTemplates: [newHabit(HABIT_TITLE, TaskType.WEEKLY, 2)],
  });
  await seed.moveTasksByTitle(plan.planId, [[HABIT_TITLE, TaskStatus.DONE]]);
  await seed.endWeek(plan.planId);

  await test.step("ST-2 the empty board shows last week's recap", async () => {
    await openPage(page, '/kanban');
    await expect(page.getByText('50%')).toBeVisible();
    await expect(page.getByText('1/2')).toBeVisible();
  });

  await test.step('A1 start a plan', async () => {
    await page.getByRole('link', {name: 'Create new plan'}).click();
    await page.waitForURL(PLAN_PAGE);
  });
});

/** A week with a daily habit and a project's first step, both in the backlog. */
const seedWeekOfWork = async (seed: Seed) => {
  // Two steps, only the first this week: its path then has a segment left empty
  const project = await seed.createProjectWithSteps(PROJECT_TITLE, [
    STEP_TITLE,
    NEXT_STEP_TITLE,
  ]);
  await seed.createWeek({
    mode: PlanMode.EXTREME,
    newTemplates: [newHabit(HABIT_TITLE, TaskType.DAILY)],
    addProjectStepIds: [project.steps[0].id],
  });
};

/** Whether a card's first dot or segment is filled and the rest are not. */
const isOnlyFirstMarkFilled = (fills: string[]) =>
  fills.length > 1 &&
  fills.slice(1).every(fill => fill !== fills[0]) &&
  new Set(fills.slice(1)).size === 1;

test("J3 a week's work on desktop: pull, finish, and it all stays", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop drags; J4 is the mobile pull');
  await seedWeekOfWork(seed);
  const todoCount = findColumnCount(page, 'TODO');
  const doneCount = findColumnCount(page, 'DONE');
  let start: Progress;
  let backlogCount: number;

  await test.step('ST-3 the board, with nothing done today', async () => {
    await openPage(page, '/kanban');
    await expect(todoCount).toHaveText('0');
    await expect(doneCount).toHaveText('0');
    start = await readProgress(page, false);
    expect(start).toMatchObject({todayDone: 0, weekDone: 0});
    backlogCount = Number(
      await findBacklogCount(page, false, false).textContent(),
    );
  });

  await test.step('A2 open the backlog', async () => {
    await openBacklog(page);
    await expect(findBacklogCard(page, false, STEP_TITLE)).toBeVisible();
    await expect(findBacklogCard(page, false, HABIT_TITLE)).toBeVisible();
    await expect(findBacklogCount(page, false, true)).toHaveText(
      String(backlogCount),
    );
  });

  await test.step('A4 MV-1 MV-3 pull the step into Todo: the counts follow, and today counts it once saved', async () => {
    await dragCardWithKeyboard(page, {
      from: 'BACKLOG',
      title: STEP_TITLE,
      keys: ['ArrowLeft', 'ArrowLeft'],
      to: 'TODO',
    });
    await expect(findBoardCard(page, 'TODO', STEP_TITLE)).toBeVisible();
    await expect(todoCount).toHaveText('1');
    await expect(findBacklogCount(page, false, true)).toHaveText(
      String(backlogCount - 1),
    );
    await expect
      .poll(() => readProgress(page, false))
      .toEqual({...start, todayTotal: start.todayTotal + 1});
  });

  await test.step('A6 MV-1 CARD-7 MV-3 finish the habit task from the backlog: its dot fills, and the progress counts it once saved', async () => {
    // Before: every dot is empty
    const backlogHabitCard = findCardOf(
      findBacklogCard(page, false, HABIT_TITLE),
    );
    expect(new Set(await readMarkFills(backlogHabitCard)).size).toBe(1);
    await dragCardWithKeyboard(page, {
      from: 'BACKLOG',
      title: HABIT_TITLE,
      keys: ['ArrowLeft'],
      to: 'DONE',
    });
    const habitCard = findCardOf(findBoardCard(page, 'DONE', HABIT_TITLE));
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(HABIT_TITLE);
    await expect(habitCard).toContainText(`1/${EXTREME_WEEK_DAYS}`);
    expect(new Set(await readMarkFills(habitCard)).size).toBe(2);
    await expect(doneCount).toHaveText('1');
    await expect(findBacklogCount(page, false, true)).toHaveText(
      String(backlogCount - 2),
    );
    await expect
      .poll(() => readProgress(page, false))
      .toEqual({
        todayDone: 1,
        todayTotal: start.todayTotal + 2,
        todayPoints: TASK_POINTS,
        weekDone: 1,
        weekPoints: TASK_POINTS,
      });
  });

  await test.step('A7 MV-1 CARD-7 MV-3 finish the step: its segment fills, and the progress counts it without a reload', async () => {
    // Before: both segments of the path are empty
    const todoStepCard = findCardOf(findBoardCard(page, 'TODO', STEP_TITLE));
    expect(new Set(await readMarkFills(todoStepCard)).size).toBe(1);
    await dragCardWithKeyboard(page, {
      from: 'TODO',
      title: STEP_TITLE,
      keys: ['ArrowRight'],
      to: 'DONE',
    });
    const stepCard = findCardOf(findBoardCard(page, 'DONE', STEP_TITLE));
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(STEP_TITLE);
    expect(isOnlyFirstMarkFilled(await readMarkFills(stepCard))).toBe(true);
    await expect(todoCount).toHaveText('0');
    await expect(doneCount).toHaveText('2');
    await expect
      .poll(() => readProgress(page, false))
      .toEqual({
        todayDone: 2,
        todayTotal: start.todayTotal + 2,
        todayPoints: 2 * TASK_POINTS,
        weekDone: 2,
        weekPoints: 2 * TASK_POINTS,
      });
  });

  await test.step('A3 close the backlog', async () => {
    await page.getByRole('button', {name: 'Close backlog'}).click();
    await expect(findBacklogCount(page, false, false)).toHaveText(
      String(backlogCount - 2),
    );
  });

  const finished = await readProgress(page, false);
  await page.reload();
  await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeVisible();
  await expect(findBoardCard(page, 'DONE', STEP_TITLE)).toBeVisible();
  expect(await readProgress(page, false)).toEqual(finished);
});

test("J4 a week's work on mobile: pull two, finish one, and it all stays", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(!isMobile, 'The tap to pull is the mobile backlog');
  await seedWeekOfWork(seed);
  const todoCount = findColumnCount(page, 'TODO');
  const doneCount = findColumnCount(page, 'DONE');
  const sheet = page.getByRole('dialog');
  let start: Progress;

  await test.step('ST-3 the board, with nothing done today', async () => {
    await openPage(page, '/kanban');
    await expect(todoCount).toHaveText('0');
    await expect(doneCount).toHaveText('0');
    start = await readProgress(page, true);
    expect(start).toMatchObject({todayDone: 0, weekDone: 0});
    await expect(findBacklogCount(page, true, false)).toHaveText('2');
  });

  await test.step('A2 open the backlog', async () => {
    await openBacklog(page);
    await expect(findBacklogCard(page, true, STEP_TITLE)).toBeVisible();
    await expect(findBacklogCard(page, true, HABIT_TITLE)).toBeVisible();
  });

  await test.step('A5 MV-1 MV-3 BL-7 pull both tasks into Todo: the counts follow, today counts each once saved, and the sheet ends empty', async () => {
    for (const [index, title] of [STEP_TITLE, HABIT_TITLE].entries()) {
      const pulled = waitForServerAction(page, '/kanban');
      await findBacklogCard(page, true, title)
        .locator('..')
        .getByRole('button', {name: 'Todo'})
        .click();
      await pulled;
      await expect(sheet).toBeVisible();
      await expect(findBacklogCount(page, true, true)).toHaveText(
        String(1 - index),
      );
      await expect(todoCount).toHaveText(String(index + 1));
      await expect
        .poll(() => readProgress(page, true))
        .toEqual({...start, todayTotal: start.todayTotal + index + 1});
    }
    await expect(sheet.getByText(BACKLOG_EMPTY_MESSAGE)).toBeVisible();
  });

  await test.step('A3 BL-7 close the backlog: with nothing left, the pill is gone', async () => {
    // The sheet's header button; its backdrop closes it too
    await sheet.getByTitle('Close backlog').click();
    // The desktop strip stays in the page, hidden at this width
    await expect(
      page.getByTitle('Open backlog').filter({visible: true}),
    ).toHaveCount(0);
  });

  await test.step('A7 MV-1 CARD-7 MV-3 finish the step: its segment fills, and the progress counts it without a reload', async () => {
    // On mobile Done is the row below Todo
    // Before: both segments of the path are empty
    const todoStepCard = findCardOf(findBoardCard(page, 'TODO', STEP_TITLE));
    expect(new Set(await readMarkFills(todoStepCard)).size).toBe(1);
    await dragCardWithKeyboard(page, {
      from: 'TODO',
      title: STEP_TITLE,
      keys: ['ArrowDown'],
      to: 'DONE',
    });
    const stepCard = findCardOf(findBoardCard(page, 'DONE', STEP_TITLE));
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(STEP_TITLE);
    expect(isOnlyFirstMarkFilled(await readMarkFills(stepCard))).toBe(true);
    await expect(todoCount).toHaveText('1');
    await expect(doneCount).toHaveText('1');
    await expect
      .poll(() => readProgress(page, true))
      .toEqual({
        todayDone: 1,
        todayTotal: start.todayTotal + 2,
        todayPoints: TASK_POINTS,
        weekDone: 1,
        weekPoints: TASK_POINTS,
      });
  });

  const finished = await readProgress(page, true);
  await page.reload();
  await expect(findBoardCard(page, 'TODO', HABIT_TITLE)).toBeVisible();
  await expect(findBoardCard(page, 'DONE', STEP_TITLE)).toBeVisible();
  expect(await readProgress(page, true)).toEqual(finished);
});
