/**
 * design/flows/auth.md, one describe per flow. A signed-in test runs as its
 * own fresh user (e2e/fixtures.ts); every test runs at both widths.
 */
import {expect, openPage, test} from './fixtures';

test.describe('Route Protection Flow', () => {
  // Signed out: no session, so no user is created either
  test.use({storageState: {cookies: [], origins: []}});

  test('a protected page sends you to sign in', async ({page}) => {
    await page.goto('/kanban/projects');
    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fkanban%2Fprojects/);
    await expect(page.getByRole('button', {name: /google/i})).toBeVisible();
  });
});

test.describe('Sign-Out Flow', () => {
  test('settings open from the navigation', async ({page}) => {
    await openPage(page, '/kanban');
    await page
      .locator('button[aria-haspopup="dialog"]:visible')
      .first()
      .click();
    await expect(page.getByRole('button', {name: 'Sign out'})).toBeVisible();
  });
});
