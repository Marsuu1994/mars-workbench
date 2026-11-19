// Spec: design/specs/board.md
/**
 * The board's journeys, each step named by the action it takes. What each
 * screen shows is held by the component tests next to the board's
 * components; here every journey runs end to end on its own seeded user.
 */
import {getThisWeek, newHabit} from '../test/factories';
import {PlanMode, TaskStatus, TaskType} from '@/utils/enums';
import type {Page} from '@playwright/test';
import {
  completeSelectedCard,
  completeTodoCard,
  countRingCelebrations,
  dragCardWithKeyboard,
  dropLiftedCard,
  findBacklogCount,
  findBacklogGroup,
  findBacklogSections,
  findBoardCard,
  findBoardColumn,
  findCardOf,
  findColumnCount,
  findDayCell,
  findDayList,
  findDayListRows,
  findOpenBacklog,
  findPileSheets,
  findRingRow,
  findTodayCell,
  findTodoCard,
  findTopCardTitle,
  liftCard,
  openBacklog,
  pressTodoCard,
  pullWithTap,
  readArcLength,
  readMarkFills,
  readProgressLabel,
  trackRingCelebrations,
} from './actions/board';
import {expect, openPage, test, type Seed} from './fixtures';

const HABIT_TITLE = 'Flashcards';
const PROJECT_TITLE = 'Spanish course';
const STEP_TITLE = 'Unit 1 — Daily routines';
const NEXT_STEP_TITLE = 'Unit 2 — At the market';
/** How often the journeys' weekly habit runs: two tasks in the backlog. */
const HABIT_RUNS = 2;
const BACKLOG_EMPTY_TITLE = "Everything's on deck!";
const DAY_CLEAR_TITLE = 'All clear for the day';
/** The hints the backlog showed under its header before BL-20. */
const OLD_BACKLOG_HINTS = [
  'Drag tasks left to Todo to start working',
  'Tap to pull a task onto the board',
];
const CLOSE_DAY_LIST = "Close the day's list";
/** The habit kind's arc on a ring (TaskKind.HABIT). */
const HABIT_ARC = 'HABIT';
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

/** Drags a backlog task onto Todo: the panel is right of Done, Done right of Todo. */
const dragToTodo = (page: Page, title: string) =>
  dragCardWithKeyboard(page, {
    from: 'BACKLOG',
    title,
    keys: ['ArrowLeft', 'ArrowLeft'],
    to: 'TODO',
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

/** A finished card in Done: its first dot or segment filled, the rest empty. */
const expectFirstMarkFilled = async (page: Page, title: string) => {
  const card = findCardOf(findBoardCard(page, 'DONE', title));
  expect(isOnlyFirstMarkFilled(await readMarkFills(card))).toBe(true);
};

/** Closes the open day's list on mobile: its sheet's own close button. */
const closeDaySheet = (page: Page) =>
  page
    .locator('dialog[open] .modal-box')
    .getByRole('button', {name: CLOSE_DAY_LIST})
    .click();

/** A press on the dimmed board around a sheet, away from the sheet itself. */
const pressOutsideSheet = (page: Page) =>
  page
    .locator('dialog[open] .modal-backdrop')
    .click({position: {x: 16, y: 16}});

/** The Done column, which only desktop has (COL-6). */
const findDoneColumn = (page: Page) =>
  page.locator('[data-rfd-droppable-id="DONE"]');

/** J12 on desktop, J13 on a phone: the same data and the same steps. */
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
  const todayCell = findTodayCell(page);

  await test.step("ST-4 the board: Todo and Done are empty, and today's ring reads 0 of 0 done", async () => {
    await openPage(page, '/kanban');
    await expect(todoCount).toHaveText('0');
    if (isMobile) await expect(findDoneColumn(page)).toHaveCount(0);
    else await expect(findColumnCount(page, 'DONE')).toHaveText('0');
    await expect(todayCell).toContainText('0 of 0 done');
    await expect(findBacklogCount(page, isMobile, false)).toHaveText('4');
  });

  await test.step('A2 BL-9 BL-11 BL-8 BL-20 open the backlog: a group per habit and per project, each on a pile of one, and no hint', async () => {
    await openBacklog(page);
    const backlog = findOpenBacklog(page, isMobile);
    await expect(findBacklogSections(page, isMobile)).toHaveText([
      'Habits',
      'Projects',
    ]);
    await expect(backlog.getByRole('heading', {level: 3})).toHaveText([
      HABIT_TITLE,
      STEP_TITLE,
    ]);
    await expectOneBehind(page, isMobile, HABIT_TITLE);
    await expectOneBehind(page, isMobile, STEP_TITLE);
    await expect(findBacklogCount(page, isMobile, true)).toHaveText('4');
    for (const hint of OLD_BACKLOG_HINTS) {
      await expect(backlog).not.toContainText(hint);
    }
  });

  await test.step("A8 BL-12 open the project's queue: the step behind shows in place of its pile", async () => {
    const group = findBacklogGroup(page, isMobile, STEP_TITLE);
    await group.getByRole('button', {name: '+1 more', exact: true}).click();
    await expect(group.getByRole('listitem')).toHaveText([
      `2${NEXT_STEP_TITLE}`,
    ]);
    await expect(findPileSheets(group)).toHaveCount(0);
  });

  await test.step(`${isMobile ? 'A9' : 'A4'} BL-13 RING-2 pull the project's next step into Todo: its second step comes up as a plain card, and today's ring counts it`, async () => {
    if (isMobile) await pullWithTap(page, true, STEP_TITLE);
    else await dragToTodo(page, STEP_TITLE);
    await expect(findTodoCard(page, STEP_TITLE)).toBeAttached();
    await expect(todoCount).toHaveText('1');
    await expect(findBacklogCount(page, isMobile, true)).toHaveText('3');
    await expectPlainCard(page, isMobile, NEXT_STEP_TITLE);
    await expect(todayCell).toContainText('0 of 1 done');
  });

  await test.step("A9 BL-13 RING-2 tap ↑ Todo on the habit's card: its second task comes up, and the backlog stays open", async () => {
    await pullWithTap(page, isMobile, HABIT_TITLE);
    await expect(findOpenBacklog(page, isMobile)).toBeVisible();
    await expect(todoCount).toHaveText('2');
    await expect(findBacklogCount(page, isMobile, true)).toHaveText('2');
    await expectPlainCard(page, isMobile, HABIT_TITLE);
    await expect(todayCell).toContainText('0 of 2 done');
  });

  await test.step('A3 close the backlog', async () => {
    await closeBacklog(page, isMobile);
    await expect(findBacklogCount(page, isMobile, false)).toHaveText('2');
    if (isMobile) await expect(page.getByRole('dialog')).toBeHidden();
  });

  await test.step('A10 TAP-1 select the habit task: it shows its ✓ Complete', async () => {
    await pressTodoCard(page, HABIT_TITLE);
    await expect(findTodoCard(page, HABIT_TITLE)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      page.getByRole('button', {name: `Complete ${HABIT_TITLE}`}),
    ).toBeVisible();
  });

  await test.step(
    isMobile
      ? "A12 COL-6 RING-3 complete it: it leaves Todo, the board has no Done, and today's ring counts it"
      : "A12 CARD-7 FX-5 RING-3 complete it: it's on top of Done and glows, its dot fills, and today's ring counts it",
    async () => {
      await completeSelectedCard(page, HABIT_TITLE);
      await expect(findTodoCard(page, HABIT_TITLE)).toHaveCount(0);
      await expect(todoCount).toHaveText('1');
      if (isMobile) {
        await expect(findDoneColumn(page)).toHaveCount(0);
      } else {
        await expect(findTopCardTitle(page, 'DONE')).toHaveText(HABIT_TITLE);
        const habitCard = findCardOf(findBoardCard(page, 'DONE', HABIT_TITLE));
        await expect(habitCard).toHaveClass(/fx-done-in/);
        await expectFirstMarkFilled(page, HABIT_TITLE);
        expect(await readProgressLabel(habitCard)).toBe(
          `1 of ${HABIT_RUNS} done this week`,
        );
        await expect(findColumnCount(page, 'DONE')).toHaveText('1');
      }
      await expect(todayCell).toContainText('1 of 2 done');
      expect(await readArcLength(todayCell, HABIT_ARC)).toBeGreaterThan(0);
    },
  );

  await test.step(`A13 DAY-3${isMobile ? ' DAY-2' : ''} open today's list: it lists the habit task`, async () => {
    await todayCell.click();
    if (isMobile) await expect(page.locator('dialog[open]')).toBeVisible();
    await expect(findDayListRows(page, isMobile)).toHaveText([HABIT_TITLE]);
  });

  await page.reload();
  await expect(findTodoCard(page, STEP_TITLE)).toBeAttached();
  await expect(todayCell).toContainText('1 of 2 done');
  if (isMobile) {
    await expect(findTodoCard(page, HABIT_TITLE)).toHaveCount(0);
    await todayCell.click();
    await expect(findDayListRows(page, true)).toHaveText([HABIT_TITLE]);
    await closeDaySheet(page);
  } else {
    const habitCard = findCardOf(findBoardCard(page, 'DONE', HABIT_TITLE));
    await expect(habitCard).toBeAttached();
    await expect(habitCard).not.toHaveClass(/fx-done-in/);
  }
  await expect(findBacklogCount(page, isMobile, false)).toHaveText('2');
  await openBacklog(page);
  await expectPlainCard(page, isMobile, HABIT_TITLE);
  await expectPlainCard(page, isMobile, NEXT_STEP_TITLE);
};

test("J12 a week's work on desktop: grouped, pulled, completed, and it all stays", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop drags; J13 is the same week on a phone');
  await runWeeksWork({page, seed, isMobile});
});

test("J13 a week's work on mobile: pulled with ↑ Todo, completed into today's ring, and it all stays", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(!isMobile, 'J12 is the same week on desktop');
  await runWeeksWork({page, seed, isMobile});
});

test('J14 finish a habit task straight from the backlog', async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Desktop only: "on mobile a backlog task reaches Done only through Todo" (BL-17)',
  );
  await trackRingCelebrations(page);
  await seedHabitWeek(seed);
  const doneCount = findColumnCount(page, 'DONE');
  const todayCell = findTodayCell(page);

  await test.step("ST-4 the board: Todo and Done are empty, and today's ring reads 0 of 0 done", async () => {
    await openPage(page, '/kanban');
    await expect(findColumnCount(page, 'TODO')).toHaveText('0');
    await expect(doneCount).toHaveText('0');
    await expect(todayCell).toContainText('0 of 0 done');
  });

  await test.step('A2 BL-11 open the backlog: the habit on a pile of one', async () => {
    await openBacklog(page);
    await expectOneBehind(page, false, HABIT_TITLE);
  });

  await test.step("A6 CARD-7 BL-13 RING-5 FX-4 COL-8 drag the habit's next task onto Done: its dot fills, today's ring closes and celebrates, and the day is clear", async () => {
    await dragCardWithKeyboard(page, {
      from: 'BACKLOG',
      title: HABIT_TITLE,
      keys: ['ArrowLeft'],
      to: 'DONE',
    });
    const habitCard = findCardOf(findBoardCard(page, 'DONE', HABIT_TITLE));
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(HABIT_TITLE);
    await expectFirstMarkFilled(page, HABIT_TITLE);
    expect(await readProgressLabel(habitCard)).toBe(
      `1 of ${HABIT_RUNS} done this week`,
    );
    await expect(doneCount).toHaveText('1');
    await expect(findBacklogCount(page, false, true)).toHaveText('1');
    await expectPlainCard(page, false, HABIT_TITLE);
    await expect(todayCell).toContainText('All 1 done');
    await expect.poll(() => countRingCelebrations(page)).toBe(1);
    await expect(
      findBoardColumn(page, 'TODO').getByText(DAY_CLEAR_TITLE),
    ).toBeVisible();
  });

  await page.reload();
  await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeAttached();
  await expect(todayCell).toContainText('All 1 done');
  expect(await countRingCelebrations(page)).toBe(0);
});

/** J15 on desktop, J16 on a phone: the same data and the same steps. */
const runWrapUpTheDay = async ({
  page,
  seed,
  isMobile,
}: {
  page: Page;
  seed: Seed;
  isMobile: boolean;
}) => {
  await trackRingCelebrations(page);
  const plan = await seedGroupedWeek(seed);
  await seed.moveTasksByTitle(plan.planId, [
    [HABIT_TITLE, TaskStatus.TODO],
    [STEP_TITLE, TaskStatus.TODO],
  ]);
  const dayClear = findBoardColumn(page, 'TODO').getByText(DAY_CLEAR_TITLE);
  const todayCell = findTodayCell(page);
  const habitCard = findTodoCard(page, HABIT_TITLE);
  const stepCard = findTodoCard(page, STEP_TITLE);

  /** Where a completed card went: on top of Done on desktop, off the board on mobile. */
  const expectCompleted = async (title: string) => {
    await expect(findTodoCard(page, title)).toHaveCount(0);
    if (isMobile) {
      await expect(findDoneColumn(page)).toHaveCount(0);
      return;
    }
    await expect(findTopCardTitle(page, 'DONE')).toHaveText(title);
    await expectFirstMarkFilled(page, title);
  };

  await test.step("ST-4 the board: two cards in Todo, nothing done, and today's ring reads 0 of 2 done", async () => {
    await openPage(page, '/kanban');
    await expect(findColumnCount(page, 'TODO')).toHaveText('2');
    if (!isMobile) await expect(findColumnCount(page, 'DONE')).toHaveText('0');
    await expect(todayCell).toContainText('0 of 2 done');
  });

  await test.step('A10 TAP-1 select the habit task, then the step: the selection moves to the step', async () => {
    await pressTodoCard(page, HABIT_TITLE);
    await expect(habitCard).toHaveAttribute('aria-pressed', 'true');
    await pressTodoCard(page, STEP_TITLE);
    await expect(stepCard).toHaveAttribute('aria-pressed', 'true');
    await expect(habitCard).toHaveAttribute('aria-pressed', 'false');
  });

  await test.step('A11 TAP-2 press the step again, away from its ✓ Complete: it goes back to normal, and nothing is finished', async () => {
    await stepCard.click({position: {x: 12, y: 12}});
    await expect(stepCard).toHaveAttribute('aria-pressed', 'false');
    await expect(findColumnCount(page, 'TODO')).toHaveText('2');
    await expect(todayCell).toContainText('0 of 2 done');
  });

  await test.step(`A10 A12 ${isMobile ? 'COL-6' : 'CARD-7'} RING-3 select the habit task and complete it: today's ring reads 1 of 2 done`, async () => {
    await completeTodoCard(page, HABIT_TITLE);
    await expectCompleted(HABIT_TITLE);
    await expect(stepCard).toBeAttached();
    await expect(todayCell).toContainText('1 of 2 done');
    expect(await countRingCelebrations(page)).toBe(0);
  });

  await test.step(`A10 A12 ${isMobile ? 'COL-7' : 'CARD-7'} RING-5 FX-4 COL-8 select the step and complete it: today's ring closes and celebrates, and the empty Todo says the day is clear`, async () => {
    const readFrame = () =>
      todayCell.evaluate(cell => getComputedStyle(cell).borderTopColor);
    const openFrame = await readFrame();
    await completeTodoCard(page, STEP_TITLE);
    await expectCompleted(STEP_TITLE);
    await expect(todayCell).toContainText('All 2 done');
    await expect(todayCell.locator('.fx-ring-check')).toBeVisible();
    await expect.poll(readFrame).not.toBe(openFrame);
    await expect.poll(() => countRingCelebrations(page)).toBe(1);
    await expect(dayClear).toBeVisible();
  });

  await page.reload();
  await expect(todayCell).toContainText('All 2 done');
  await expect(dayClear).toBeVisible();
  expect(await countRingCelebrations(page)).toBe(0);
  if (isMobile) {
    await todayCell.click();
    await expect(findDayListRows(page, true)).toHaveText([
      HABIT_TITLE,
      `${STEP_TITLE}${PROJECT_TITLE}`,
    ]);
  } else {
    await expect(findColumnCount(page, 'DONE')).toHaveText('2');
  }
};

test('J15 wrap up the day on desktop', async ({page, seed, isMobile}) => {
  test.skip(isMobile, 'J16 is the same day on a phone');
  await runWrapUpTheDay({page, seed, isMobile});
});

test("J16 wrap up the day on mobile: completed cards leave the board for today's list", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(!isMobile, 'J15 is the same day on desktop');
  await runWrapUpTheDay({page, seed, isMobile});
});

const DAILY_HABIT_TITLE = 'Stretch';
const ONE_OFF_TITLE = 'Book the dentist';
/** The cells' short day names, Monday first (Board.Rings.Days). */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Other days a 390 px row fits beside today (RING-1). */
const MOBILE_OTHER_DAYS = 3;

/**
 * J17 on desktop, J18 on a phone. The spec's week is seen on a Wednesday;
 * the server's clock can't be frozen (test/README.md › e2e), so the journey
 * runs on the real week, with the spec's Monday and Tuesday as the two days
 * before today. A week that has no two days before today yet (Monday,
 * Tuesday) can't hold it.
 */
const runLookBack = async ({
  page,
  seed,
  isMobile,
}: {
  page: Page;
  seed: Seed;
  isMobile: boolean;
}) => {
  const {dates, todayIndex} = getThisWeek();
  const [firstIndex, secondIndex] = [todayIndex - 2, todayIndex - 1];
  const [firstDate, secondDate] = [dates[firstIndex], dates[secondIndex]];
  const [firstName, secondName] = [
    DAY_NAMES[firstIndex],
    DAY_NAMES[secondIndex],
  ];

  // A habit that runs twice a day and a one-off: both of the first day's
  // habit tasks and the one-off done that day, one of the second day's
  // habit tasks done and the other expired, and nothing done today
  const oneOff = await seed.createOneOff({title: ONE_OFF_TITLE});
  const {plan} = await seed.createWeek({
    newTemplates: [newHabit(DAILY_HABIT_TITLE, TaskType.DAILY, 2)],
    addOneOffTaskIds: [oneOff.id],
  });
  await seed.createEarlierDay(plan.planId, {
    date: firstDate,
    habitTitle: DAILY_HABIT_TITLE,
    doneCount: 2,
    expiredCount: 0,
    alsoFinished: [ONE_OFF_TITLE],
  });
  await seed.createEarlierDay(plan.planId, {
    date: secondDate,
    habitTitle: DAILY_HABIT_TITLE,
    doneCount: 1,
    expiredCount: 1,
  });

  // The days the row shows: all seven on desktop; on a 390 px phone today
  // and the three days before it, the days after filling in early in the week
  const shownFirst = isMobile ? Math.max(0, todayIndex - MOBILE_OTHER_DAYS) : 0;
  const shownLast = isMobile
    ? Math.min(dates.length - 1, shownFirst + MOBILE_OTHER_DAYS)
    : dates.length - 1;
  const firstCell = findDayCell(page, firstDate);
  const secondCell = findDayCell(page, secondDate);
  const todayCell = findTodayCell(page);
  const dayList = findDayList(page, isMobile);

  await test.step(`ST-4 RING-3 RING-4 RING-7${isMobile ? ' RING-1' : ''} the board: the first day's ring is closed, the second's half filled, and the days after today aren't buttons`, async () => {
    await openPage(page, '/kanban');
    await expect(firstCell).toHaveAttribute(
      'aria-label',
      `${firstName}: 3 of 3 done — habits 2 of 2, one-offs 1 of 1`,
    );
    await expect(firstCell.locator('.fx-ring-check')).toBeVisible();
    await expect(secondCell).toHaveAttribute(
      'aria-label',
      `${secondName}: 1 of 2 done — habits 1 of 2`,
    );
    await expect(secondCell.locator('.fx-ring-check')).toHaveCount(0);
    expect(await readArcLength(secondCell, HABIT_ARC)).toBeGreaterThan(0);
    // Today and the days before it that show are buttons; the days after
    // today that show are not
    const row = findRingRow(page);
    await expect(row.locator('[data-day-cell]')).toHaveCount(
      todayIndex - shownFirst + 1,
    );
    await expect(row.getByRole('img')).toHaveCount(shownLast - todayIndex);
    if (isMobile) {
      await expect(row.locator(':scope > div')).toHaveCount(
        shownLast - shownFirst + 1,
      );
      await expect(findDayCell(page, dates[shownFirst])).toBeVisible();
    }
  });

  await test.step(`A13 DAY-3 ${isMobile ? 'DAY-2' : 'DAY-5'} open the first day's list: three of three done, the habit tasks then the one-off`, async () => {
    await firstCell.click();
    await expect(firstCell).toHaveAttribute('aria-expanded', 'true');
    if (isMobile) {
      await expect(dayList).toBeVisible();
    } else {
      // It floats under the row, below the day's cell
      const cellBox = await firstCell.boundingBox();
      const listBox = await dayList.boundingBox();
      expect(listBox?.y).toBeGreaterThanOrEqual(
        (cellBox?.y ?? 0) + (cellBox?.height ?? 0),
      );
      await expect(
        dayList.getByRole('button', {name: CLOSE_DAY_LIST}),
      ).toBeFocused();
    }
    await expect(dayList).toContainText(firstName);
    await expect(dayList).toContainText('3 of 3 done');
    await expect(findDayListRows(page, isMobile)).toHaveText([
      DAILY_HABIT_TITLE,
      DAILY_HABIT_TITLE,
      ONE_OFF_TITLE,
    ]);
  });

  await test.step("A13 DAY-1 open the second day's list: the first day's closes", async () => {
    // On mobile the sheet covers the row: it closes first
    if (isMobile) await pressOutsideSheet(page);
    await secondCell.click();
    await expect(dayList).toHaveCount(1);
    await expect(firstCell).toHaveAttribute('aria-expanded', 'false');
    await expect(dayList).toContainText('1 of 2 done');
    await expect(findDayListRows(page, isMobile)).toHaveText([
      DAILY_HABIT_TITLE,
    ]);
  });

  await test.step(
    isMobile
      ? "A14 DAY-4 close the second day's sheet"
      : "A14 DAY-4 press the second day's cell again: the list closes",
    async () => {
      // On mobile the sheet covers the cell, so its own close button closes it
      if (isMobile) await closeDaySheet(page);
      else await secondCell.click();
      await expect(dayList).toHaveCount(0);
      await expect(secondCell).toHaveAttribute('aria-expanded', 'false');
    },
  );

  await test.step("A13 DAY-3 open today's list: nothing done yet", async () => {
    await todayCell.click();
    await expect(dayList).toContainText('Today');
    await expect(dayList).toContainText('0 of 0 done');
    await expect(dayList).toContainText('Nothing yet');
  });

  await test.step(
    isMobile
      ? 'A14 DAY-4 press outside the sheet, on the dimmed board: it closes'
      : "A14 DAY-5 press Esc: the list closes, and focus is back on today's cell",
    async () => {
      if (isMobile) {
        await pressOutsideSheet(page);
      } else {
        await page.keyboard.press('Escape');
        await expect(todayCell).toBeFocused();
      }
      await expect(dayList).toHaveCount(0);
    },
  );
};

/** Why J17 and J18 skip early in the week. */
const TOO_EARLY_IN_THE_WEEK =
  'The journey looks back at the two days before today, and this week has none yet: the server runs on the real date (test/README.md › e2e)';

test('J17 look back at a day on desktop', async ({page, seed, isMobile}) => {
  test.skip(isMobile, 'J18 is the same week on a phone');
  test.skip(getThisWeek().todayIndex < 2, TOO_EARLY_IN_THE_WEEK);
  await runLookBack({page, seed, isMobile});
});

test('J18 look back at a day on mobile: each list opens in a sheet', async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(!isMobile, 'J17 is the same week on desktop');
  test.skip(getThisWeek().todayIndex < 2, TOO_EARLY_IN_THE_WEEK);
  await runLookBack({page, seed, isMobile});
});

/** The emptied backlog's box, in the panel or the sheet, with a count of 0. */
const expectAllOnDeck = async (page: Page, isMobile: boolean) => {
  const backlog = findOpenBacklog(page, isMobile);
  await expect(backlog.getByText(BACKLOG_EMPTY_TITLE)).toBeVisible();
  await expect(findBacklogCount(page, isMobile, true)).toHaveText('0');
};

test('J19 clear the backlog on desktop', async ({page, seed, isMobile}) => {
  test.skip(isMobile, 'Desktop drags; J20 is the mobile tap');
  await seedHabitWeek(seed);
  const panel = findBoardColumn(page, 'BACKLOG');

  await test.step('ST-4 the board: the strip shows 2', async () => {
    await openPage(page, '/kanban');
    await expect(findBacklogCount(page, false, false)).toHaveText('2');
  });

  await test.step('A2 BL-11 open the backlog: the habit on a pile of one', async () => {
    await openBacklog(page);
    await expectOneBehind(page, false, HABIT_TITLE);
    await expect(findBacklogCount(page, false, true)).toHaveText('2');
  });

  await test.step('A9 BL-13 tap ↑ Todo on its card: its second task comes up as a plain card, and the panel stays open', async () => {
    await pullWithTap(page, false, HABIT_TITLE);
    await expectPlainCard(page, false, HABIT_TITLE);
    await expect(panel).toBeVisible();
    await expect(findBacklogCount(page, false, true)).toHaveText('1');
  });

  await test.step('BL-18 lift the last card: its place holds an empty placeholder, and the count stays', async () => {
    await liftCard(page, {from: 'BACKLOG', title: HABIT_TITLE});
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[aria-live]')).toContainText([/to list DONE/]);
    const placeholder = panel.locator('[data-rfd-placeholder-context-id]');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveText('');
    await expect(findBacklogCount(page, false, true)).toHaveText('1');
  });

  await test.step('A4 BL-19 drop it on Todo: the panel shows that everything is on deck', async () => {
    await dropLiftedCard(page, {keys: ['ArrowLeft'], to: 'TODO'});
    await expectAllOnDeck(page, false);
  });

  await test.step('A3 BL-19 close the backlog: the strip stays and shows 0', async () => {
    await closeBacklog(page, false);
    await expect(findBacklogCount(page, false, false)).toHaveText('0');
  });

  await test.step('A2 BL-19 open it again: everything is on deck again', async () => {
    await openBacklog(page);
    await expectAllOnDeck(page, false);
  });
});

test('J20 clear the backlog on mobile', async ({page, seed, isMobile}) => {
  test.skip(!isMobile, 'J19 is the same week on desktop');
  await seedHabitWeek(seed);

  await test.step('ST-4 the board: the pill shows 2', async () => {
    await openPage(page, '/kanban');
    await expect(findBacklogCount(page, true, false)).toHaveText('2');
  });

  await test.step('A2 BL-11 open the backlog: the pill opens the sheet, the habit on a pile of one', async () => {
    await openBacklog(page);
    await expectOneBehind(page, true, HABIT_TITLE);
    await expect(findBacklogCount(page, true, true)).toHaveText('2');
  });

  await test.step('A9 BL-13 pull its next task: the count reads 1', async () => {
    await pullWithTap(page, true, HABIT_TITLE);
    await expectPlainCard(page, true, HABIT_TITLE);
    await expect(findBacklogCount(page, true, true)).toHaveText('1');
  });

  await test.step('A9 BL-19 pull the last one: the sheet stays open and shows that everything is on deck', async () => {
    await pullWithTap(page, true, HABIT_TITLE);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectAllOnDeck(page, true);
  });

  await test.step('A3 BL-19 close the backlog: the pill stays and shows 0', async () => {
    await closeBacklog(page, true);
    await expect(findBacklogCount(page, true, false)).toHaveText('0');
  });

  await test.step('A2 BL-19 open it again: everything is on deck again', async () => {
    await openBacklog(page);
    await expectAllOnDeck(page, true);
  });
});
