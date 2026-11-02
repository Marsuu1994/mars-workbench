/**
 * design/flows/board.md, one describe per flow. Every test seeds the week it
 * reads (e2e/fixtures.ts) and runs at both widths.
 */
import type {Page} from '@playwright/test';
import {newHabit} from '../test/factories';
import {PlanMode, TaskStatus, TaskType} from '@/utils/enums';
import {
  expectTodayDoneCount,
  findBoardCard,
  findBoardColumn,
} from './actions/board';
import {
  expect,
  expectToSee,
  openPage,
  test,
  waitForServerAction,
} from './fixtures';

const HABIT_TITLE = 'Flashcards';
const PROJECT_TITLE = 'Spanish course';
const STEP_TITLE = 'Unit 1 — Daily routines';

test.describe('Landing Flow', () => {
  test('the board shows the week', async ({page, seed}) => {
    const project = await seed.createProjectWithSteps(PROJECT_TITLE, [
      STEP_TITLE,
    ]);
    const {plan} = await seed.createWeek({
      mode: PlanMode.EXTREME,
      newTemplates: [newHabit(HABIT_TITLE, TaskType.DAILY)],
      addProjectStepIds: [project.steps[0].id],
    });
    await seed.moveTasksByTitle(plan.planId, [
      [HABIT_TITLE, TaskStatus.TODO],
      [STEP_TITLE, TaskStatus.TODO],
    ]);

    await page.goto('/kanban');
    await expectToSee(page, HABIT_TITLE);
    await expectToSee(page, STEP_TITLE);
  });
});

/**
 * @hello-pangea/dnd's keyboard drag — lift, one column on, drop — stepping
 * on its screen-reader announcements. Todo and Done sit side by side on
 * desktop and stacked on mobile, so "on" is right or down.
 */
const dragOneColumnOn = async (
  page: Page,
  isMobile: boolean,
  title: string,
) => {
  const announcements = page.locator('[aria-live]');
  await findBoardColumn(page, 'TODO')
    .getByRole('button', {name: new RegExp(title)})
    .focus();
  await page.keyboard.press('Space');
  await expect(announcements).toContainText([/lifted/]);
  await page.keyboard.press(isMobile ? 'ArrowDown' : 'ArrowRight');
  await expect(announcements).toContainText([/to list DONE/]);
  const statusSaved = waitForServerAction(page, '/kanban');
  await page.keyboard.press('Space');
  await expect(announcements).toContainText([/dropped/]);
  await statusSaved;
};

test.describe('Drag and Drop Flow', () => {
  test("a card dragged to Done stays done, and the day's progress counts it", async ({
    page,
    seed,
    isMobile,
  }) => {
    const {plan} = await seed.createWeek({
      mode: PlanMode.EXTREME,
      newTemplates: [newHabit(HABIT_TITLE, TaskType.DAILY)],
    });
    await seed.moveTasksByTitle(plan.planId, [[HABIT_TITLE, TaskStatus.TODO]]);
    await openPage(page, '/kanban');
    await expect(findBoardCard(page, 'TODO', HABIT_TITLE)).toBeVisible();
    await expectTodayDoneCount(page, isMobile, 0);

    await dragOneColumnOn(page, isMobile, HABIT_TITLE);
    await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeVisible();
    await expectTodayDoneCount(page, isMobile, 1);

    await page.reload();
    await expect(findBoardCard(page, 'DONE', HABIT_TITLE)).toBeVisible();
    await expect(findBoardCard(page, 'TODO', HABIT_TITLE)).toHaveCount(0);
    await expectTodayDoneCount(page, isMobile, 1);
  });
});

test.describe('Backlog Flow', () => {
  test('the backlog takes focus only while it is open', async ({
    page,
    seed,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      'A desktop rule: only the visible side of the desktop backlog can take focus (Backlog Flow › Rules)',
    );
    const project = await seed.createProjectWithSteps(PROJECT_TITLE, [
      STEP_TITLE,
    ]);
    await seed.createWeek({
      mode: PlanMode.EXTREME,
      newTemplates: [newHabit(HABIT_TITLE, TaskType.DAILY)],
      addProjectStepIds: [project.steps[0].id],
    });
    const card = findBoardColumn(page, 'BACKLOG').getByRole('button', {
      name: new RegExp(STEP_TITLE),
    });
    const openButton = page.getByTitle('Open backlog');
    const closeButton = page.getByRole('button', {name: 'Close backlog'});
    await openPage(page, '/kanban');

    // Collapsed, the faded-out panel stays mounted but out of reach
    await card.focus();
    await expect(card).not.toBeFocused();
    await closeButton.focus();
    await expect(closeButton).not.toBeFocused();

    await openButton.focus();
    await page.keyboard.press('Enter');
    await expect(closeButton).toBeFocused();
    await card.focus();
    await expect(card).toBeFocused();
    await openButton.focus();
    await expect(openButton).not.toBeFocused();

    await closeButton.focus();
    await page.keyboard.press('Enter');
    await expect(openButton).toBeFocused();
  });
});
