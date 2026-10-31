/**
 * The key journeys on desktop, in order. Most change the e2e user's week (its
 * global setup reseeds it before every run); the rest only read it.
 */
import type {Page} from '@playwright/test';
import {SEED_HABITS, SEED_ONE_OFFS, SEED_PROJECTS} from '../test/seedData';
import {
  PLAN_LINK,
  expect,
  openPage,
  test,
  waitForServerAction,
} from './fixtures';

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
  const statusSaved = waitForServerAction(page, '/kanban');
  await page.keyboard.press('Space');
  await expect(announcements).toContainText([/dropped/]);

  await expect(findCard(page, 'DONE', title)).toBeVisible();
  await statusSaved;
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
  const tracked = waitForServerAction(page, '/kanban/priorities');
  await page.getByRole('button', {name: 'Todo', exact: true}).click();
  await expect(card).toContainText('This Week');

  await tracked;
  await page.goto('/kanban');
  await expect(findCard(page, 'TODO', title)).toBeVisible();
});

test("a step put on this week lands in the board's backlog", async ({page}) => {
  const {course} = SEED_PROJECTS;
  // Units 1–3 are on the week already; Unit 4 is the first upcoming step
  const upcomingStep = course.steps[3].title;
  await openPage(page, '/kanban/projects');
  await page.getByRole('button', {name: new RegExp(course.title)}).click();
  const scheduled = waitForServerAction(page, '/kanban/projects');
  await page.getByTitle('Put on this week').first().click();
  // Take-back is offered on steps still in the week's backlog: Unit 3, Unit 4
  await expect(page.getByTitle('Take off this week')).toHaveCount(2);

  await scheduled;
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

/** Archives a project from its Edit modal, through the confirm bar. */
const archiveProject = async (page: Page, title: string) => {
  await page.getByRole('button', {name: new RegExp(title)}).click();
  await page.getByRole('button', {name: 'Edit', exact: true}).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', {name: 'Archive', exact: true}).click();
  const archived = waitForServerAction(page, '/kanban/projects');
  await modal.getByRole('button', {name: 'Archive', exact: true}).click();
  await archived;
};

test('archived projects sit in a collapsed accordion', async ({page}) => {
  // The contract for the Archived accordion (design/mockup/
  // temp-projects-archived-accordion.html): delete this line when it lands
  test.fail(true, 'Archived accordion not built yet');
  const {book, course} = SEED_PROJECTS;
  const bookCard = page.getByRole('button', {name: new RegExp(book.title)});
  const courseCard = page.getByRole('button', {name: new RegExp(course.title)});
  const archivedHeader = page.getByRole('button', {name: /^Archived/});
  const unarchiveButton = page.getByRole('button', {name: 'Unarchive'});
  const reloadPage = async () => {
    await page.reload();
    await page.waitForLoadState('networkidle');
  };
  await openPage(page, '/kanban/projects');

  // Nothing archived in the seed's week: no section at all
  await expect(archivedHeader).toHaveCount(0);

  await archiveProject(page, book.title);
  await expect(bookCard).toHaveCount(0);

  // Collapsed by default: the header names the count, the rows stay out
  await expect(archivedHeader).toHaveAccessibleName(/^Archived\s*1$/);
  await expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');
  await expect(unarchiveButton).toHaveCount(0);

  // The header opens and closes it
  await archivedHeader.click();
  await expect(archivedHeader).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(new RegExp(`^${book.title} · `))).toBeVisible();
  await expect(unarchiveButton).toBeVisible();
  await archivedHeader.click();
  await expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');
  await expect(unarchiveButton).toHaveCount(0);

  // Open / closed is page state: a reload starts collapsed again
  await archivedHeader.click();
  await reloadPage();
  await expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');

  // With every project archived, the page opens with the section open
  await archiveProject(page, course.title);
  await reloadPage();
  await expect(page.getByText('No active projects')).toBeVisible();
  await expect(archivedHeader).toHaveAccessibleName(/^Archived\s*2$/);
  await expect(archivedHeader).toHaveAttribute('aria-expanded', 'true');
  await expect(unarchiveButton).toHaveCount(2);

  // Unarchive keeps it open; unarchiving the last one removes the section
  const firstUnarchived = waitForServerAction(page, '/kanban/projects');
  await unarchiveButton.first().click();
  await firstUnarchived;
  await expect(archivedHeader).toHaveAttribute('aria-expanded', 'true');
  await expect(unarchiveButton).toHaveCount(1);
  const lastUnarchived = waitForServerAction(page, '/kanban/projects');
  await unarchiveButton.click();
  await lastUnarchived;
  await expect(bookCard).toBeVisible();
  await expect(courseCard).toBeVisible();
  await expect(archivedHeader).toHaveCount(0);
});
