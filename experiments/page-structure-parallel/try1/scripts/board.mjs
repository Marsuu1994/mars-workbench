// Board: every BoardPageContext handler — drag to Done (desktop), pull to Todo (mobile).
const column = (page, status) => page.locator(`[data-rfd-droppable-id="${status}"]`);
const heading = (page, status, title) => column(page, status).getByRole('heading', {name: title});

await warmUp(browser, ['/kanban']);

{
  const page = await newPage(browser, DESKTOP);
  await check('Board desktop: a Todo card dragged to Done stays done (handleDragEnd)', async () => {
    const title = 'Flashcards';
    await openPage(page, '/kanban');
    await expect(heading(page, 'TODO', title)).toBeVisible();
    const announcements = page.locator('[aria-live]');
    await column(page, 'TODO').getByRole('button', {name: new RegExp(title)}).focus();
    await page.keyboard.press('Space');
    await expect(announcements).toContainText([/lifted/]);
    await page.keyboard.press('ArrowRight');
    await expect(announcements).toContainText([/to list DONE/]);
    const saved = waitForAction(page, '/kanban');
    await page.keyboard.press('Space');
    await expect(heading(page, 'DONE', title)).toBeVisible();
    await saved;
    await reload(page);
    await expect(heading(page, 'DONE', title)).toBeVisible();
    await expect(heading(page, 'TODO', title)).toHaveCount(0);
  });
  await page.context().close();
}

{
  const page = await newPage(browser, MOBILE);
  await check('Board mobile: the backlog sheet pulls a card to Todo (pullToTodo)', async () => {
    const title = 'Unit 3 — Travel';
    await openPage(page, '/kanban');
    await expect(heading(page, 'TODO', title)).toHaveCount(0);
    await page.getByTitle('Open backlog').filter({visible: true}).click();
    const sheet = page.locator('dialog[open]');
    await expect(sheet).toBeVisible();
    const card = sheet.locator('div.card', {has: page.getByRole('heading', {name: title})});
    await expect(card).toBeVisible();
    const saved = waitForAction(page, '/kanban');
    await card.getByRole('button', {name: 'Todo'}).click();
    await saved;
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(heading(page, 'TODO', title)).toBeVisible();
    await reload(page);
    await expect(heading(page, 'TODO', title)).toBeVisible();
  });
  await page.context().close();
}

await finish(browser);
