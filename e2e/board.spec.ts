// Spec: design/specs/board.md
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
import type {Page} from '@playwright/test';
import {
  dragCardWithKeyboard,
  dropLiftedCard,
  findBacklogCount,
  findBacklogGroup,
  findBacklogSections,
  findBoardCard,
  findBoardColumn,
  findCardOf,
  findColumnCount,
  findOpenBacklog,
  findPileSheets,
  findTopCardTitle,
  liftCard,
  openBacklog,
  pullWithTap,
  readMarkFills,
  readProgress,
  readProgressLabel,
  type Progress,
} from './actions/board';
import {expect, openPage, test, type Seed} from './fixtures';

const HABIT_TITLE = 'Flashcards';
const PROJECT_TITLE = 'Spanish course';
const STEP_TITLE = 'Unit 1 — Daily routines';
const NEXT_STEP_TITLE = 'Unit 2 — At the market';
/** A small task's points: every task these journeys seed is small. */
const TASK_POINTS = SIZE_TO_POINTS[TaskSize.SMALL];
/** How often the journeys' weekly habit runs: two tasks in the backlog. */
const HABIT_RUNS = 2;
const BACKLOG_EMPTY_TITLE = "Everything's on deck!";
const DAY_CLEAR_TITLE = 'All clear for the day';
const DRAG_HINT = 'Drag tasks left to Todo to start working';
const TAP_HINT = 'Tap to pull a task onto the board';
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

/** A week with a weekly habit's two tasks and a project's two steps, all in the backlog. */
const seedGroupedWeek = async (seed: Seed) => {
  const project = await seed.createProjectWithSteps(PROJECT_TITLE, [
    STEP_TITLE,
    NEXT_STEP_TITLE,
  ]);
  const {plan} = await seed.createWeek({
    newTemplates: [newHabit(HABIT_TITLE, TaskType.WEEKLY, HABIT_RUNS)],
    addProjectStepIds: project.steps.map(({id}) => id),
  });
  return plan;
};

/** A week with only a weekly habit's two tasks, both in the backlog. */
const seedHabitWeek = (seed: Seed) =>
  seed.createWeek({
    newTemplates: [newHabit(HABIT_TITLE, TaskType.WEEKLY, HABIT_RUNS)],
  });

/** How a journey pulls a backlog task into Todo, at either width. */
const pullToTodo = async (page: Page, isMobile: boolean, title: string) => {
  if (isMobile) {
    await pullWithTap(page, title);
    return;
  }
  await dragCardWithKeyboard(page, {
    from: 'BACKLOG',
    title,
    keys: ['ArrowLeft', 'ArrowLeft'],
    to: 'TODO',
  });
};

/** How a journey finishes a Todo card: Done is right of Todo, or the row below. */
const finishFromTodo = (page: Page, isMobile: boolean, title: string) =>
  dragCardWithKeyboard(page, {
    from: 'TODO',
    title,
    keys: [isMobile ? 'ArrowDown' : 'ArrowRight'],
    to: 'DONE',
  });

const closeBacklog = (page: Page, isMobile: boolean) =>
  (isMobile ? page.getByRole('dialog') : page)
    .getByTitle('Close backlog')
    .filter({visible: true})
    .click();

/** Whether a card's first dot or segment is filled and the rest are not. */
const isOnlyFirstMarkFilled = (fills: string[]) =>
  fills.length > 1 &&
  fills.slice(1).every(fill => fill !== fills[0]) &&
  new Set(fills.slice(1)).size === 1;

/** A group's card is plain: nothing behind it, so no +N more and no pile. */
const expectPlainCard = async (
  page: Page,
  isMobile: boolean,
  title: string,
) => {
  const group = findBacklogGroup(page, isMobile, title);
  await expect(group).not.toContainText('more');
  await expect(findPileSheets(group)).toHaveCount(0);
  await expect(group.getByRole('list')).toHaveCount(0);
};

/** A group's card with one task behind it: +1 more, on a pile of one sheet. */
const expectOneBehind = async (
  page: Page,
  isMobile: boolean,
  title: string,
) => {
  const group = findBacklogGroup(page, isMobile, title);
  await expect(group).toContainText('+1 more');
  await expect(findPileSheets(group)).toHaveCount(1);
};

/** J5 on desktop, J6 on a phone: the same data and the same steps. */
const runWeeksWork = async ({
  page,
  seed,
  isMobile,
}: {
  page: Page;
  seed: Seed;
  isMobile: boolean;
}) => {
  await seedGroupedWeek(seed);
  const todoCount = findColumnCount(page, 'TODO');
  const doneCount = findColumnCount(page, 'DONE');
  let start: Progress;

  await test.step('ST-3 the board, with nothing done today', async () => {
    await openPage(page, '/kanban');
    await expect(todoCount).toHaveText('0');
    await expect(doneCount).toHaveText('0');
    start = await readProgress(page, isMobile);
    expect(start).toMatchObject({todayDone: 0, weekDone: 0});
    await expect(findBacklogCount(page, isMobile, false)).toHaveText('4');
  });

  await test.step('A2 BL-9 BL-11 BL-8 open the backlog: a group per habit and per project, each on a pile of one', async () => {
    await openBacklog(page);
    await expect(findBacklogSections(page, isMobile)).toHaveText([
      'Habits',
      'Projects',
    ]);
    await expect(
      findOpenBacklog(page, isMobile).getByRole('heading', {level: 3}),
    ).toHaveText([HABIT_TITLE, STEP_TITLE]);
    await expectOneBehind(page, isMobile, HABIT_TITLE);
    await expectOneBehind(page, isMobile, STEP_TITLE);
    await expect(findBacklogCount(page, isMobile, true)).toHaveText('4');
  });

  await test.step("A8 BL-12 open the project's queue: the step behind shows in place of its pile", async () => {
    const group = findBacklogGroup(page, isMobile, STEP_TITLE);
    await group.getByRole('button', {name: '+1 more', exact: true}).click();
    await expect(group.getByRole('listitem')).toHaveText([
      `2${NEXT_STEP_TITLE}`,
    ]);
    await expect(findPileSheets(group)).toHaveCount(0);
  });

  await test.step(`${isMobile ? 'A5' : 'A4'} MV-5 BL-13 MV-3 pull the project's next step into Todo: its second step comes up as a plain card`, async () => {
    await pullToTodo(page, isMobile, STEP_TITLE);
    await expect(findBoardCard(page, 'TODO', STEP_TITLE)).toBeAttached();
    await expect(todoCount).toHaveText('1');
    await expect(findBacklogCount(page, isMobile, true)).toHaveText('3');
    await expectPlainCard(page, isMobile, NEXT_STEP_TITLE);
    if (isMobile) await expect(page.getByRole('dialog')).toBeVisible();
    await expect
      .poll(() => readProgress(page, isMobile))
      .toEqual({...start, todayTotal: start.todayTotal + 1});
  });

  await test.step(`${isMobile ? 'A5' : 'A4'} MV-5 BL-13 pull the habit's next task into Todo: its second task comes up as a plain card`, async () => {
    await pullToTodo(page, isMobile, HABIT_TITLE);
    await expect(todoCount).toHaveText('2');
    await expect(findBacklogCount(page, isMobile, true)).toHaveText('2');
    await expectPlainCard(page, isMobile, HABIT_TITLE);
    await expect
      .poll(() => readProgress(page, isMobile))
      .toEqual({...start, todayTotal: start.todayTotal + 2});
  });

  await test.step('A3 close the backlog', async () => {
    await closeBacklog(page, isMobile);
    await expect(findBacklogCount(page, isMobile, false)).toHaveText('2');
    if (isMobile) await expect(page.getByRole('dialog')).toBeHidden();
  });

  await test.step('A7 MV-5 CARD-7 MV-3 finish the habit task: its dot fills, and the progress counts it without a reload', async () => {
    await finishFromTodo(page, isMobile, HABIT_TITLE);
    const habitCard = findCardOf(findBoardCard(page, 'DONE', HABIT_TITLE));
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(HABIT_TITLE);
    expect(isOnlyFirstMarkFilled(await readMarkFills(habitCard))).toBe(true);
    expect(await readProgressLabel(habitCard)).toBe(
      `1 of ${HABIT_RUNS} done this week`,
    );
    await expect(todoCount).toHaveText('1');
    await expect(doneCount).toHaveText('1');
    await expect
      .poll(() => readProgress(page, isMobile))
      .toEqual({
        todayDone: 1,
        todayTotal: start.todayTotal + 2,
        todayPoints: TASK_POINTS,
        weekDone: 1,
        weekPoints: TASK_POINTS,
      });
  });

  const finished = await readProgress(page, isMobile);
  await page.reload();
  await expect(findBoardCard(page, 'TODO', STEP_TITLE)).toBeAttached();
  await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeAttached();
  expect(await readProgress(page, isMobile)).toEqual(finished);
  await expect(findBacklogCount(page, isMobile, false)).toHaveText('2');
  await openBacklog(page);
  await expectPlainCard(page, isMobile, HABIT_TITLE);
  await expectPlainCard(page, isMobile, NEXT_STEP_TITLE);
};

test("J5 a week's work on desktop: grouped, pulled, finished, and it all stays", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop drags; J6 is the same week on a phone');
  await runWeeksWork({page, seed, isMobile});
});

test("J6 a week's work on mobile: grouped, pulled with ↑ Todo, finished, and it all stays", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(!isMobile, 'The tap to pull is the mobile backlog; J5 is desktop');
  await runWeeksWork({page, seed, isMobile});
});

test('J11 finish a habit task straight from the backlog', async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Desktop only: "on mobile a backlog task reaches Done only through Todo" (BL-10)',
  );
  await seedHabitWeek(seed);
  const doneCount = findColumnCount(page, 'DONE');
  let start: Progress;

  await test.step('ST-3 the board, with nothing done today', async () => {
    await openPage(page, '/kanban');
    await expect(findColumnCount(page, 'TODO')).toHaveText('0');
    await expect(doneCount).toHaveText('0');
    start = await readProgress(page, false);
    expect(start).toMatchObject({todayDone: 0, weekDone: 0});
  });

  await test.step('A2 BL-11 open the backlog: the habit on a pile of one', async () => {
    await openBacklog(page);
    await expectOneBehind(page, false, HABIT_TITLE);
  });

  await test.step("A6 MV-5 CARD-7 BL-13 MV-3 drag the habit's next task onto Done: its dot fills, and its second task comes up", async () => {
    await dragCardWithKeyboard(page, {
      from: 'BACKLOG',
      title: HABIT_TITLE,
      keys: ['ArrowLeft'],
      to: 'DONE',
    });
    const habitCard = findCardOf(findBoardCard(page, 'DONE', HABIT_TITLE));
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(HABIT_TITLE);
    expect(isOnlyFirstMarkFilled(await readMarkFills(habitCard))).toBe(true);
    expect(await readProgressLabel(habitCard)).toBe(
      `1 of ${HABIT_RUNS} done this week`,
    );
    await expect(doneCount).toHaveText('1');
    await expect(findBacklogCount(page, false, true)).toHaveText('1');
    await expectPlainCard(page, false, HABIT_TITLE);
    await expect
      .poll(() => readProgress(page, false))
      .toEqual({
        todayDone: 1,
        todayTotal: start.todayTotal + 1,
        todayPoints: TASK_POINTS,
        weekDone: 1,
        weekPoints: TASK_POINTS,
      });
  });

  const finished = await readProgress(page, false);
  await page.reload();
  await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeAttached();
  expect(await readProgress(page, false)).toEqual(finished);
});

/** J7 on desktop, J8 on a phone: the same data and the same steps. */
const runWrapUpTheDay = async ({
  page,
  seed,
  isMobile,
}: {
  page: Page;
  seed: Seed;
  isMobile: boolean;
}) => {
  const plan = await seedGroupedWeek(seed);
  await seed.moveTasksByTitle(plan.planId, [
    [HABIT_TITLE, TaskStatus.TODO],
    [STEP_TITLE, TaskStatus.TODO],
  ]);
  const dayClear = findBoardColumn(page, 'TODO').getByText(DAY_CLEAR_TITLE);

  await test.step('ST-3 the board: two cards in Todo, nothing done', async () => {
    await openPage(page, '/kanban');
    await expect(findColumnCount(page, 'TODO')).toHaveText('2');
    await expect(findColumnCount(page, 'DONE')).toHaveText('0');
  });

  await test.step('A7 CARD-7 finish the habit task: its dot fills, and the step is still in Todo', async () => {
    await finishFromTodo(page, isMobile, HABIT_TITLE);
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(HABIT_TITLE);
    const habitCard = findCardOf(findBoardCard(page, 'DONE', HABIT_TITLE));
    expect(isOnlyFirstMarkFilled(await readMarkFills(habitCard))).toBe(true);
    await expect(findBoardCard(page, 'TODO', STEP_TITLE)).toBeAttached();
    await expect(dayClear).toHaveCount(0);
  });

  await test.step('A7 CARD-7 COL-5 finish the step: its segment fills, and the empty Todo says the day is clear', async () => {
    await finishFromTodo(page, isMobile, STEP_TITLE);
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(STEP_TITLE);
    const stepCard = findCardOf(findBoardCard(page, 'DONE', STEP_TITLE));
    expect(isOnlyFirstMarkFilled(await readMarkFills(stepCard))).toBe(true);
    await expect(dayClear).toBeVisible();
  });

  await page.reload();
  await expect(dayClear).toBeVisible();
  await expect(findColumnCount(page, 'DONE')).toHaveText('2');
};

test('J7 wrap up the day on desktop', async ({page, seed, isMobile}) => {
  test.skip(isMobile, 'J8 is the same day on a phone');
  await runWrapUpTheDay({page, seed, isMobile});
});

test("J8 wrap up the day on mobile: the box shows in Todo's row", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(!isMobile, 'J7 is the same day on desktop');
  await runWrapUpTheDay({page, seed, isMobile});
});

/** The emptied backlog's box, in the panel or the sheet, with no hint. */
const expectAllOnDeck = async (page: Page, isMobile: boolean) => {
  const backlog = findOpenBacklog(page, isMobile);
  await expect(backlog.getByText(BACKLOG_EMPTY_TITLE)).toBeVisible();
  await expect(backlog).not.toContainText(isMobile ? TAP_HINT : DRAG_HINT);
  await expect(findBacklogCount(page, isMobile, true)).toHaveText('0');
};

test('J9 clear the backlog on desktop', async ({page, seed, isMobile}) => {
  test.skip(isMobile, 'Desktop drags; J10 is the mobile tap');
  await seedHabitWeek(seed);
  const panel = findBoardColumn(page, 'BACKLOG');

  await test.step('ST-3 the board: the strip shows 2', async () => {
    await openPage(page, '/kanban');
    await expect(findBacklogCount(page, false, false)).toHaveText('2');
  });

  await test.step('A2 BL-11 open the backlog: the habit on a pile of one', async () => {
    await openBacklog(page);
    await expectOneBehind(page, false, HABIT_TITLE);
    await expect(findBacklogCount(page, false, true)).toHaveText('2');
  });

  await test.step('A4 BL-13 pull its next task into Todo: its second task comes up as a plain card', async () => {
    await pullToTodo(page, false, HABIT_TITLE);
    await expectPlainCard(page, false, HABIT_TITLE);
    await expect(findBacklogCount(page, false, true)).toHaveText('1');
  });

  await test.step('BL-14 lift the last card: its place holds an empty placeholder, and the hint and the count stay', async () => {
    await liftCard(page, {from: 'BACKLOG', title: HABIT_TITLE});
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[aria-live]')).toContainText([/to list DONE/]);
    const placeholder = panel.locator('[data-rfd-placeholder-context-id]');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveText('');
    await expect(panel).toContainText(DRAG_HINT);
    await expect(findBacklogCount(page, false, true)).toHaveText('1');
  });

  await test.step('A4 BL-15 drop it on Todo: the panel shows that everything is on deck', async () => {
    await dropLiftedCard(page, {keys: ['ArrowLeft'], to: 'TODO'});
    await expectAllOnDeck(page, false);
  });

  await test.step('A3 BL-15 close the backlog: the strip stays and shows 0', async () => {
    await closeBacklog(page, false);
    await expect(findBacklogCount(page, false, false)).toHaveText('0');
  });

  await test.step('A2 BL-15 open it again: everything is on deck again', async () => {
    await openBacklog(page);
    await expectAllOnDeck(page, false);
  });
});

test('J10 clear the backlog on mobile', async ({page, seed, isMobile}) => {
  test.skip(!isMobile, 'The tap to pull is the mobile backlog; J9 is desktop');
  await seedHabitWeek(seed);

  await test.step('ST-3 the board: the pill shows 2', async () => {
    await openPage(page, '/kanban');
    await expect(findBacklogCount(page, true, false)).toHaveText('2');
  });

  await test.step('A2 BL-11 open the backlog: the pill opens the sheet, the habit on a pile of one', async () => {
    await openBacklog(page);
    await expectOneBehind(page, true, HABIT_TITLE);
    await expect(findBacklogCount(page, true, true)).toHaveText('2');
  });

  await test.step('A5 BL-13 pull its next task: the count reads 1', async () => {
    await pullWithTap(page, HABIT_TITLE);
    await expectPlainCard(page, true, HABIT_TITLE);
    await expect(findBacklogCount(page, true, true)).toHaveText('1');
  });

  await test.step('A5 BL-15 pull the last one: the sheet stays open and shows that everything is on deck', async () => {
    await pullWithTap(page, HABIT_TITLE);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectAllOnDeck(page, true);
  });

  await test.step('A3 BL-15 close the backlog: the pill stays and shows 0', async () => {
    await closeBacklog(page, true);
    await expect(findBacklogCount(page, true, false)).toHaveText('0');
  });

  await test.step('A2 BL-15 open it again: everything is on deck again', async () => {
    await openBacklog(page);
    await expectAllOnDeck(page, true);
  });
});
