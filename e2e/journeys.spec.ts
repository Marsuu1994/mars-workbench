/**
 * The key journeys on desktop, in order. Most change the e2e user's week (its
 * global setup reseeds it before every run); the rest only read it.
 */
import type {Page} from '@playwright/test';
import {SEED_HABITS, SEED_ONE_OFFS, SEED_PROJECTS} from '../test/seedData';
import {PLAN_LINK, expect, openPage, test} from './fixtures';

test.describe.configure({mode: 'serial'});

/** A board column by status: the drop zones are keyed by it. */
const boardColumn = (page: Page, status: 'BACKLOG' | 'TODO' | 'DONE') =>
  page.locator(`[data-rfd-droppable-id="${status}"]`);

/** A card by its title; Done cards aren't draggable, so not buttons. */
const findCard = (
  page: Page,
  status: 'BACKLOG' | 'TODO' | 'DONE',
  title: string,
) => boardColumn(page, status).getByRole('heading', {name: title});

test('a card dragged to Done stays done', async ({page}) => {
  const {title} = SEED_HABITS.flashcards;
  await openPage(page, '/kanban');
  await expect(findCard(page, 'TODO', title)).toBeVisible();

  // @hello-pangea/dnd's keyboard drag — lift, one column right, drop —
  // stepping on its screen-reader announcements
  const announcements = page.locator('[aria-live]');
  await boardColumn(page, 'TODO')
    .getByRole('button', {name: new RegExp(title)})
    .focus();
  await page.keyboard.press('Space');
  await expect(announcements).toContainText([/lifted/]);
  await page.keyboard.press('ArrowRight');
  await expect(announcements).toContainText([/to list DONE/]);
  await page.keyboard.press('Space');
  await expect(announcements).toContainText([/dropped/]);

  await expect(findCard(page, 'DONE', title)).toBeVisible();
  await page.reload();
  await expect(findCard(page, 'DONE', title)).toBeVisible();
  await expect(findCard(page, 'TODO', title)).toHaveCount(0);
});

test('a one-off tracked from the matrix lands on the board', async ({page}) => {
  const {title} = SEED_ONE_OFFS[2];
  await openPage(page, '/kanban/priorities');
  const card = page.getByRole('button', {name: new RegExp(title)});
  await card.hover();
  await card.getByRole('button', {name: 'Move task'}).click();
  await page.getByRole('button', {name: 'Todo', exact: true}).click();
  await expect(card).toContainText('This Week');

  await page.goto('/kanban');
  await expect(findCard(page, 'TODO', title)).toBeVisible();
});

test("a step put on this week lands in the board's backlog", async ({page}) => {
  const {course} = SEED_PROJECTS;
  // Units 1–3 are on the week already; Unit 4 is the first upcoming step
  const upcomingStep = course.steps[3].title;
  await openPage(page, '/kanban/projects');
  await page.getByRole('button', {name: new RegExp(course.title)}).click();
  await page.getByTitle('Put on this week').first().click();
  // Take-back is offered on steps still in the week's backlog: Unit 3, Unit 4
  await expect(page.getByTitle('Take off this week')).toHaveCount(2);

  await page.goto('/kanban');
  await expect(findCard(page, 'BACKLOG', upcomingStep)).toHaveCount(1);
});

test('a habit removed from the plan leaves the board', async ({page}) => {
  const {title} = SEED_HABITS.review;
  await page.goto('/kanban');
  await expect(
    page.getByRole('button', {name: new RegExp(title)}).first(),
  ).toBeVisible();
  const planHref = await page.locator(PLAN_LINK).first().getAttribute('href');
  await openPage(page, planHref!);

  // The title, not the row's center: its type and frequency controls keep
  // their clicks to themselves
  await page
    .getByRole('button', {name: new RegExp(`^${title}`)})
    .getByText(title, {exact: true})
    .click();
  await expect(page.getByText(/^2 templates/)).toBeVisible();
  await page.getByRole('button', {name: 'Update Plan'}).click();
  const review = page.getByRole('dialog');
  await expect(review.getByText('Review Plan Changes')).toBeVisible();
  await expect(review.getByText(title)).toBeVisible();
  await review.getByRole('button', {name: 'Confirm & Regenerate'}).click();
  await expect(page).toHaveURL(/\/kanban$/);

  await page.goto('/kanban');
  await expect(page.getByRole('button', {name: new RegExp(title)})).toHaveCount(
    0,
  );
});

test('the backlog takes focus only while it is open', async ({page}) => {
  // Unit 3 sits in the seed week's backlog
  const card = boardColumn(page, 'BACKLOG').getByRole('button', {
    name: new RegExp(SEED_PROJECTS.course.steps[2].title),
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
