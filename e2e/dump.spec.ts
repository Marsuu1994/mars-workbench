/**
 * design/flows/dump.md, one describe per flow. Every test seeds the entries
 * it reads (e2e/fixtures.ts) and runs at both widths.
 */
import {expect, expectToSee, test} from './fixtures';

const ENTRY = 'Maybe the board needs a weekly review ritual on Sundays.';

test.describe('Dump Landing Flow (View)', () => {
  test('the dump shows its entries and the composer', async ({page, seed}) => {
    await seed.createDumpEntry(ENTRY);

    await page.goto('/kanban/dump');
    await expect(
      page.getByRole('textbox', {name: "What's on your mind?"}),
    ).toBeVisible();
    await expectToSee(page, ENTRY);
  });
});
