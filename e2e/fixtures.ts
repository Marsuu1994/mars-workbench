import {expect, test as base, type Page} from '@playwright/test';

/**
 * Every e2e test fails on a browser console error or an uncaught page error,
 * so a page that renders but logs a crash doesn't pass.
 */
export const test = base.extend<{failOnConsoleErrors: void}>({
  failOnConsoleErrors: [
    async ({page}, use) => {
      const errors: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));
      await use();
      expect(errors, 'console errors').toEqual([]);
    },
    {auto: true},
  ],
});

export {expect};

/** The active plan's edit page, as the Plan nav item links to it. */
export const PLAN_LINK = 'a[href^="/kanban/plans/"]';

/**
 * Opens a page and waits until it is hydrated: a click or key press before
 * React attaches its handlers lands on server HTML and does nothing.
 */
export const openPage = async (page: Page, path: string) => {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
};

/**
 * Waits for the next server action the page posts to `path` to answer. An
 * optimistic update shows before its action saves it, so a reload or
 * navigation right after one can abort the save: start waiting before the
 * click, and await it before leaving the page.
 */
export const waitForServerAction = (page: Page, path: string) =>
  page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === path,
  );
