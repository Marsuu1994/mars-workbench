/**
 * Every page renders the e2e user's seeded week without console errors, on
 * desktop and mobile (the smoke-desktop and smoke-mobile projects).
 */
import type {Page} from '@playwright/test';
import {
  SEED_DUMP_ENTRIES,
  SEED_HABITS,
  SEED_ONE_OFFS,
  SEED_PROJECTS,
} from '../test/seedData';
import {PLAN_LINK, expect, openPage, test} from './fixtures';

/**
 * The text where it shows. A page can hold a hidden copy too: its other
 * layout, or a streamed Suspense chunk React hasn't swapped in yet.
 */
const expectToSee = (page: Page, text: string) =>
  expect(page.getByText(text).filter({visible: true}).first()).toBeVisible();

test('the board shows the week', async ({page}) => {
  await page.goto('/kanban');
  await expectToSee(page, SEED_HABITS.flashcards.title);
  await expectToSee(page, SEED_PROJECTS.course.steps[1].title);
});

test('the priority matrix lists the open one-offs', async ({page}) => {
  await page.goto('/kanban/priorities');
  for (const {title} of SEED_ONE_OFFS.slice(2)) {
    await expectToSee(page, title);
  }
});

test('projects list both projects', async ({page}) => {
  await page.goto('/kanban/projects');
  for (const {title} of Object.values(SEED_PROJECTS)) {
    await expectToSee(page, title);
  }
});

test("the plan form opens on this week's plan", async ({page}) => {
  await page.goto('/kanban');
  const planHref = await page.locator(PLAN_LINK).first().getAttribute('href');
  await page.goto(planHref!);
  await expect(
    page.getByRole('heading', {name: 'Update Weekly Plan'}),
  ).toBeVisible();
  await expectToSee(page, SEED_HABITS.review.title);
});

test('the dump shows its entries and the composer', async ({page}) => {
  await page.goto('/kanban/dump');
  await expect(
    page.getByRole('textbox', {name: "What's on your mind?"}),
  ).toBeVisible();
  await expectToSee(page, SEED_DUMP_ENTRIES[0]);
});

test('settings open from the navigation', async ({page}) => {
  await openPage(page, '/kanban');
  await page.locator('button[aria-haspopup="dialog"]:visible').first().click();
  await expect(page.getByRole('button', {name: 'Sign out'})).toBeVisible();
});

test.describe('signed out', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('a protected page sends you to sign in', async ({page}) => {
    await page.goto('/kanban/projects');
    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fkanban%2Fprojects/);
    await expect(page.getByRole('button', {name: /google/i})).toBeVisible();
  });
});
