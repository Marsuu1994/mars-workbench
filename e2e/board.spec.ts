// Spec: design/flows/board.md
/**
 * The board's journeys, each step named by the action it takes. What each
 * screen shows is held by the component tests next to the board's
 * components; here every journey runs end to end on its own seeded user.
 */
import {newHabit} from '../test/factories';
import {PlanMode, TaskStatus, TaskType} from '@/utils/enums';
import {
  dragCardWithKeyboard,
  expectTodayDoneCount,
  findBacklogCard,
  findBoardCard,
  openBacklog,
} from './actions/board';
import {expect, openPage, test, waitForServerAction} from './fixtures';

const HABIT_TITLE = 'Flashcards';
const PROJECT_TITLE = 'Spanish course';
const STEP_TITLE = 'Unit 1 — Daily routines';
/** Where Start a plan leads, wherever the app is served. */
const PLAN_PAGE = /\/kanban\/plans\/new$/;

test('J1 a new user starts their first plan', async ({page}) => {
  await test.step('ST-1 the empty board asks for a first plan', async () => {
    await openPage(page, '/kanban');
  });

  await test.step('A1 start a plan', async () => {
    await page.getByRole('link', {name: 'Create your first plan'}).click();
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

test("J3 a week's work on desktop: pull, finish, and it all stays", async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop drags; J4 is the mobile pull');
  const project = await seed.createProjectWithSteps(PROJECT_TITLE, [
    STEP_TITLE,
  ]);
  await seed.createWeek({
    mode: PlanMode.EXTREME,
    newTemplates: [newHabit(HABIT_TITLE, TaskType.DAILY)],
    addProjectStepIds: [project.steps[0].id],
  });

  await test.step('ST-3 the board', async () => {
    await openPage(page, '/kanban');
  });

  await test.step('A2 open the backlog', async () => {
    await openBacklog(page);
    await expect(findBacklogCard(page, false, STEP_TITLE)).toBeVisible();
    await expect(findBacklogCard(page, false, HABIT_TITLE)).toBeVisible();
  });

  await test.step('A4 pull the step into Todo', async () => {
    await dragCardWithKeyboard(page, {
      from: 'BACKLOG',
      title: STEP_TITLE,
      keys: ['ArrowLeft', 'ArrowLeft'],
      to: 'TODO',
    });
    await expect(findBoardCard(page, 'TODO', STEP_TITLE)).toBeVisible();
  });

  await test.step('A6 finish the habit task from the backlog', async () => {
    await dragCardWithKeyboard(page, {
      from: 'BACKLOG',
      title: HABIT_TITLE,
      keys: ['ArrowLeft'],
      to: 'DONE',
    });
    await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeVisible();
  });

  await test.step('A7 finish the step', async () => {
    await dragCardWithKeyboard(page, {
      from: 'TODO',
      title: STEP_TITLE,
      keys: ['ArrowRight'],
      to: 'DONE',
    });
    await expect(findBoardCard(page, 'DONE', STEP_TITLE)).toBeVisible();
  });

  await test.step('A3 close the backlog', async () => {
    await page.getByRole('button', {name: 'Close backlog'}).click();
  });

  await page.reload();
  await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeVisible();
  await expect(findBoardCard(page, 'DONE', STEP_TITLE)).toBeVisible();
  await expectTodayDoneCount(page, false, 2);
});

test('J4 a mobile pull: two tasks into Todo, the sheet staying open', async ({
  page,
  seed,
  isMobile,
}) => {
  test.skip(!isMobile, 'The tap to pull is the mobile backlog');
  const project = await seed.createProjectWithSteps(PROJECT_TITLE, [
    STEP_TITLE,
  ]);
  await seed.createWeek({
    mode: PlanMode.EXTREME,
    newTemplates: [newHabit(HABIT_TITLE, TaskType.DAILY)],
    addProjectStepIds: [project.steps[0].id],
  });

  await test.step('ST-3 the board', async () => {
    await openPage(page, '/kanban');
  });

  await test.step('A2 open the backlog', async () => {
    await openBacklog(page);
  });

  await test.step('A5 pull both tasks into Todo', async () => {
    const sheet = page.getByRole('dialog');
    for (const title of [STEP_TITLE, HABIT_TITLE]) {
      const pulled = waitForServerAction(page, '/kanban');
      await findBacklogCard(page, true, title)
        .locator('..')
        .getByRole('button', {name: 'Todo'})
        .click();
      await pulled;
      await expect(sheet).toBeVisible();
    }
  });

  await test.step('A3 close the backlog', async () => {
    // The sheet's header button; its backdrop closes it too
    await page.getByRole('dialog').getByTitle('Close backlog').click();
  });

  await page.reload();
  await expect(findBoardCard(page, 'TODO', STEP_TITLE)).toBeVisible();
  await expect(findBoardCard(page, 'TODO', HABIT_TITLE)).toBeVisible();
});
