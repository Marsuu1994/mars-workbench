/**
 * design/specs/projects.md, one describe per flow. Every test seeds the
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
  // The modal closes, and leaves the URL, once the saved list has landed: a
  // reload before that would open it again from the URL
  await expect(modal).toBeHidden();
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

// Spike design/spike/config-driven-modals.md › Option 2E: the open modal is
// the URL's `?modal=`, so a link (a notification later) opens it directly
test.describe('Modal URL Flow', () => {
  test('a link opens a modal, closing it clears the URL, back closes one opened in the page', async ({
    page,
    seed,
  }) => {
    const {steps} = await seed.createProjectWithSteps(
      COURSE.title,
      COURSE.steps,
    );
    const [firstStep] = steps;
    const modal = page.getByRole('dialog');
    // FieldRow's label isn't tied to its input, so the field goes by placeholder
    const titleField = modal.getByPlaceholder(
      'e.g. Lecture 4 — Cell signaling',
    );
    const editStepUrl = new RegExp(`modal=editStep&stepId=${firstStep.id}`);

    // DIAGNOSTIC (temporary): what Next's router fetches and writes to history
    page.on('request', request => {
      const headers = request.headers();
      if (headers.rsc || headers['next-action']) {
        console.warn('[diag] request', request.method(), request.url());
      }
    });
    page.on('console', message => {
      if (message.text().startsWith('[hist]')) console.warn(message.text());
    });
    await page.addInitScript(() => {
      for (const method of ['pushState', 'replaceState'] as const) {
        const original = window.history[method].bind(window.history);
        window.history[method] = (data, unused, url) => {
          const keys = data ? Object.keys(data).join(',') : 'null';
          console.warn(`[hist] ${method} ${String(url)} keys=${keys}`);
          return original(data, unused, url);
        };
      }
      window.addEventListener('popstate', () =>
        console.warn(`[hist] popstate ${location.href}`),
      );
      document.addEventListener(
        'close',
        () => console.warn(`[hist] dialog close ${location.href}`),
        true,
      );
    });

    // Loaded with the modal in the URL: it opens on the step it names, and
    // closing it takes the modal out of the URL
    await openPage(
      page,
      `/kanban/projects?modal=editStep&stepId=${firstStep.id}`,
    );
    await expect(modal.getByText('Edit Step')).toBeVisible();
    await expect(titleField).toHaveValue(COURSE.steps[0]);
    // The footer's Cancel; the header's × is labelled Cancel too
    await modal.getByText('Cancel', {exact: true}).click();
    await expect(modal).toBeHidden();
    await expect(page).not.toHaveURL(/modal=/);

    // Opened in the page: back closes it, forward opens it again
    console.warn('[diag] before card click', page.url());
    await page.getByRole('button', {name: new RegExp(COURSE.title)}).click();
    console.warn('[diag] after card click', page.url());
    await page.getByRole('button', {name: 'Edit step'}).first().click();
    console.warn('[diag] after edit click', page.url());
    await expect(page).toHaveURL(editStepUrl);
    await expect(titleField).toHaveValue(COURSE.steps[0]);
    await page.goBack();
    await expect(modal).toBeHidden();
    await expect(page).not.toHaveURL(/modal=/);
    await page.goForward();
    await expect(titleField).toHaveValue(COURSE.steps[0]);

    // A save closes it once, back to the project it was opened from
    const saved = waitForServerAction(page, '/kanban/projects');
    await titleField.fill('Unit 1 — Morning routines');
    await modal.getByRole('button', {name: 'Save changes'}).click();
    await saved;
    await expect(modal).toBeHidden();
    await expect(page).not.toHaveURL(/modal=/);
    await expectToSee(page, 'Unit 1 — Morning routines');

    // A step that's gone opens nothing
    await openPage(
      page,
      '/kanban/projects?modal=editStep&stepId=00000000-0000-4000-8000-00000000dead',
    );
    await expect(modal).toBeHidden();
  });
});
