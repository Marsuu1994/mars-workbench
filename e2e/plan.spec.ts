/**
 * design/flows/plan.md, one describe per flow. Every test seeds the week it
 * reads (e2e/fixtures.ts) and runs at both widths.
 */
import type {Page} from '@playwright/test';
import {newHabit} from '../test/factories';
import {PlanMode, TaskStatus, TaskType} from '@/utils/enums';
import {PLAN_LINK, expect, expectToSee, openPage, test} from './fixtures';

const DAILY_HABIT_TITLE = 'Flashcards';
const WEEKLY_HABIT_TITLE = 'Weekly review';

/** The active plan's edit page, reached the way the Plan nav item links to it. */
const openPlanForm = async (page: Page) => {
  await page.goto('/kanban');
  const planHref = await page.locator(PLAN_LINK).first().getAttribute('href');
  await openPage(page, planHref!);
};

test.describe('Update Plan Flow', () => {
  test("the plan form opens on this week's plan", async ({page, seed}) => {
    await seed.createWeek({
      newTemplates: [newHabit(WEEKLY_HABIT_TITLE, TaskType.WEEKLY, 2)],
    });

    await openPlanForm(page);
    await expect(
      page.getByRole('heading', {name: 'Update Weekly Plan'}),
    ).toBeVisible();
    await expectToSee(page, WEEKLY_HABIT_TITLE);
  });

  test('a habit removed from the plan leaves the board', async ({
    page,
    seed,
  }) => {
    const {plan} = await seed.createWeek({
      mode: PlanMode.EXTREME,
      newTemplates: [
        newHabit(DAILY_HABIT_TITLE, TaskType.DAILY),
        newHabit(WEEKLY_HABIT_TITLE, TaskType.WEEKLY, 2),
      ],
    });
    await seed.moveTasksByTitle(plan.planId, [
      [WEEKLY_HABIT_TITLE, TaskStatus.TODO],
    ]);
    await page.goto('/kanban');
    await expect(
      page.getByRole('button', {name: new RegExp(WEEKLY_HABIT_TITLE)}).first(),
    ).toBeVisible();

    await openPlanForm(page);
    // The title, not the row's center: its type and frequency controls keep
    // their clicks to themselves
    await page
      .getByRole('button', {name: new RegExp(`^${WEEKLY_HABIT_TITLE}`)})
      .getByText(WEEKLY_HABIT_TITLE, {exact: true})
      .click();
    await expect(page.getByText(/^1 template\b/)).toBeVisible();
    await page.getByRole('button', {name: 'Update Plan'}).click();
    const review = page.getByRole('dialog');
    await expect(review.getByText('Review Plan Changes')).toBeVisible();
    await expect(review.getByText(WEEKLY_HABIT_TITLE)).toBeVisible();
    await review.getByRole('button', {name: 'Confirm & Regenerate'}).click();
    await expect(page).toHaveURL(/\/kanban$/);

    await page.goto('/kanban');
    await expect(
      page.getByRole('button', {name: new RegExp(WEEKLY_HABIT_TITLE)}),
    ).toHaveCount(0);
  });
});
