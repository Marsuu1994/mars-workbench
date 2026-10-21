/**
 * Every Design Console scenario tab renders without a console error and its
 * play steps run: the check an agent would otherwise script in a browser.
 */
import type {Page} from '@playwright/test';
import {expect, test} from './fixtures';

/** Play errors; Next's route announcer is an alert too, but stays empty. */
const findPlayErrors = (page: Page) =>
  page.getByRole('alert').filter({hasText: /\S/});

const FEATURES = ['auth', 'board', 'dump', 'plan', 'priorities', 'projects'];

for (const feature of FEATURES) {
  test(`${feature} scenarios render and play`, async ({page}) => {
    await page.goto(`/design/scenarios/${feature}`);
    const tabs = page
      .getByRole('tablist', {name: 'Scenarios'})
      .getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    for (let index = 0; index < tabCount; index++) {
      const tab = tabs.nth(index);
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      // A failed play step prints itself under the frame's title
      await expect(findPlayErrors(page)).toHaveCount(0);
    }
  });
}

test('the gallery renders every layer tab', async ({page}) => {
  await page.goto('/design');
  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();
  for (let index = 0; index < tabCount; index++) {
    await tabs.nth(index).click();
    await expect(findPlayErrors(page)).toHaveCount(0);
  }
});
