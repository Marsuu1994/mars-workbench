/**
 * design/flows/projects.md, one describe per flow. Every test seeds the
 * projects it reads (e2e/fixtures.ts) and runs at both widths.
 */
import type {Locator, Page} from '@playwright/test';
import {newHabit} from '../test/factories';
import {TaskType} from '@/utils/enums';
import {findBacklogCard, openBacklog} from './actions/board';
import {
  expect,
  expectToSee,
  openPage,
  test,
  waitForServerAction,
} from './fixtures';

const COURSE = {
  title: 'Spanish A2 course',
  steps: ['Unit 1 — Daily routines', 'Unit 2 — Past tense'],
};
const BOOK = {
  title: 'Read Deep Work',
  steps: ['Part 1 — The idea', 'Part 2 — The rules'],
};

test.describe('Projects Landing Flow', () => {
  test('projects list the active projects', async ({page, seed}) => {
    for (const {title, steps} of [COURSE, BOOK]) {
      await seed.createProjectWithSteps(title, steps);
    }

    await page.goto('/kanban/projects');
    for (const {title} of [COURSE, BOOK]) {
      await expectToSee(page, title);
    }
  });
});

test.describe('Schedule Step Flow', () => {
  test("a step put on this week lands in the board's backlog", async ({
    page,
    seed,
    isMobile,
  }) => {
    await seed.createProjectWithSteps(COURSE.title, COURSE.steps);
    await seed.createWeek({
      newTemplates: [newHabit('Flashcards', TaskType.DAILY)],
    });
    await openPage(page, '/kanban/projects');
    await page.getByRole('button', {name: new RegExp(COURSE.title)}).click();

    const scheduled = waitForServerAction(page, '/kanban/projects');
    await page.getByTitle('Put on this week').first().click();
    // Take-back is offered on a step still in the week's backlog
    await expect(page.getByTitle('Take off this week')).toHaveCount(1);
    await scheduled;

    await openPage(page, '/kanban');
    await openBacklog(page);
    await expect(
      findBacklogCard(page, isMobile, COURSE.steps[0]),
    ).toBeVisible();
  });
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

/**
 * Unarchives a project from the Archived section. The page then opens it —
 * beside the list on desktop, over it on mobile — so mobile steps back to
 * the list once the project shows.
 */
const unarchiveProject = async (
  page: Page,
  isMobile: boolean,
  unarchiveButton: Locator,
) => {
  const unarchived = waitForServerAction(page, '/kanban/projects');
  await unarchiveButton.click();
  await unarchived;
  if (isMobile) {
    await page.getByRole('button', {name: 'All projects'}).click();
  }
};

test.describe('Edit Project Flow', () => {
  test('archived projects sit in a collapsed accordion', async ({
    page,
    seed,
    isMobile,
  }) => {
    for (const {title, steps} of [COURSE, BOOK]) {
      await seed.createProjectWithSteps(title, steps);
    }
    const bookCard = page.getByRole('button', {name: new RegExp(BOOK.title)});
    const courseCard = page.getByRole('button', {
      name: new RegExp(COURSE.title),
    });
    const archivedHeader = page.getByRole('button', {name: /^Archived/});
    const unarchiveButton = page.getByRole('button', {name: 'Unarchive'});
    const reloadPage = async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
    };
    await openPage(page, '/kanban/projects');

    // Nothing archived yet: no section at all
    await expect(archivedHeader).toHaveCount(0);

    await archiveProject(page, BOOK.title);
    await expect(bookCard).toHaveCount(0);

    // Collapsed by default: the header names the count, the rows stay out
    await expect(archivedHeader).toHaveAccessibleName(/^Archived\s*1$/);
    await expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');
    await expect(unarchiveButton).toHaveCount(0);

    // The header opens and closes it
    await archivedHeader.click();
    await expect(archivedHeader).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(new RegExp(`^${BOOK.title} · `))).toBeVisible();
    await expect(unarchiveButton).toBeVisible();
    await archivedHeader.click();
    await expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');
    await expect(unarchiveButton).toHaveCount(0);

    // Open / closed is page state: a reload starts collapsed again
    await archivedHeader.click();
    await reloadPage();
    await expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');

    // With every project archived, the page opens with the section open. The
    // "No active projects" state sits in the detail pane, which mobile shows
    // only for an open project
    await archiveProject(page, COURSE.title);
    await reloadPage();
    if (!isMobile) {
      await expect(page.getByText('No active projects')).toBeVisible();
    }
    await expect(archivedHeader).toHaveAccessibleName(/^Archived\s*2$/);
    await expect(archivedHeader).toHaveAttribute('aria-expanded', 'true');
    await expect(unarchiveButton).toHaveCount(2);

    // Unarchive keeps it open; unarchiving the last one removes the section
    await unarchiveProject(page, isMobile, unarchiveButton.first());
    await expect(archivedHeader).toHaveAttribute('aria-expanded', 'true');
    await expect(unarchiveButton).toHaveCount(1);
    await unarchiveProject(page, isMobile, unarchiveButton);
    await expect(bookCard).toBeVisible();
    await expect(courseCard).toBeVisible();
    await expect(archivedHeader).toHaveCount(0);
  });
});
