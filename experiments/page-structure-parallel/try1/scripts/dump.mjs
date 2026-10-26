// Dump: every DumpPageContext handler — capture (⌘/Ctrl+Enter and the button), load more.
const composer = page => page.getByPlaceholder("What's on your mind?");
const ENTRY = index => `Experiment capture ${index}`;
const OLDEST_SEED = 'Maybe the board needs a weekly review ritual on Sundays.';
const SECOND_SEED = 'Idea: a reading list project once the book is done.';

await warmUp(browser, ['/kanban/dump']);

{
  const page = await newPage(browser, DESKTOP);
  await check('Dump: page opens', async () => openPage(page, '/kanban/dump'));

  await check('Dump: Ctrl+Enter captures an entry at the top of the feed (capture)', async () => {
    await composer(page).fill(ENTRY(1));
    const saved = waitForAction(page, '/kanban/dump');
    await composer(page).press('Control+Enter');
    await expect(page.getByText(ENTRY(1))).toBeVisible();
    await saved;
    await expect(composer(page)).toHaveValue('');
  });

  await check('Dump: the Dump button captures 17 more entries (capture)', async () => {
    for (let index = 2; index <= 18; index += 1) {
      await composer(page).fill(ENTRY(index));
      const saved = waitForAction(page, '/kanban/dump');
      await page.getByRole('button', {name: 'Dump', exact: true}).click();
      await expect(page.getByText(ENTRY(index))).toBeVisible();
      await saved;
    }
  });

  await check('Dump: scrolling to the bottom loads the next page (loadMore)', async () => {
    await reload(page);
    await expect(page.getByText(SECOND_SEED)).toBeVisible();
    await expect(page.getByText(OLDEST_SEED)).toHaveCount(0);
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('.overflow-y-auto')) element.scrollTop = element.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    });
    await expect(page.getByText(OLDEST_SEED)).toBeVisible({timeout: 10_000});
  });
  await page.context().close();
}

await finish(browser);
