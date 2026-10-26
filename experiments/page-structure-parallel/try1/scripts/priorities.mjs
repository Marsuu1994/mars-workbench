// Priorities: every PrioritiesPageContext handler — popover track / complete / undo,
// quadrant drag and quadrant Add (desktop); sheet complete / undo / track and the
// picker add (mobile).
const quadrant = (page, id) => page.locator(`[data-rfd-droppable-id="${id}"]`);
const cardIn = (page, id, title) => quadrant(page, id).getByRole('button', {name: new RegExp(title)});
const anyCard = (page, title) => page.getByRole('button', {name: new RegExp(title)});
const toast = page => page.getByRole('status');

await warmUp(browser, ['/kanban/priorities']);

{
  const page = await newPage(browser, DESKTOP);
  await check('Priorities: page opens', async () => openPage(page, '/kanban/priorities'));

  await check('Priorities desktop: popover → Todo tracks the task (trackTask)', async () => {
    const title = 'Set up a retirement account';
    const card = anyCard(page, title);
    await card.hover();
    await card.getByRole('button', {name: 'Move task'}).click();
    const saved = waitForAction(page, '/kanban/priorities');
    await page.getByRole('button', {name: 'Todo', exact: true}).click();
    await expect(card).toContainText('This Week');
    await saved;
    await reload(page);
    await expect(anyCard(page, title)).toContainText('This Week');
  });

  await check('Priorities desktop: popover → Done removes the card and opens the undo toast (completeTask)', async () => {
    const title = 'Reply to the landlord';
    const card = anyCard(page, title);
    await card.hover();
    await card.getByRole('button', {name: 'Move task'}).click();
    const completed = waitForAction(page, '/kanban/priorities');
    await page.getByRole('button', {name: 'Done', exact: true}).click();
    await expect(anyCard(page, title)).toHaveCount(0);
    await expect(toast(page)).toContainText('Marked done');
    await completed;
  });

  await check('Priorities desktop: Undo puts the card back where it was (undo)', async () => {
    const title = 'Reply to the landlord';
    const restored = waitForAction(page, '/kanban/priorities');
    await toast(page).getByRole('button', {name: 'Undo'}).click();
    await expect(cardIn(page, 'SQUEEZE_IN', title)).toBeVisible();
    await restored;
    await reload(page);
    await expect(cardIn(page, 'SQUEEZE_IN', title)).toBeVisible();
  });

  await check('Priorities desktop: a card dragged to another quadrant is reprioritized (handleDragEnd)', async () => {
    const title = 'Sort old photos';
    await expect(cardIn(page, 'MAYBE_LATER', title)).toBeVisible();
    const announcements = page.locator('[aria-live]');
    await cardIn(page, 'MAYBE_LATER', title).focus();
    await page.keyboard.press('Space');
    await expect(announcements).toContainText([/lifted/]);
    await page.keyboard.press('ArrowLeft');
    await expect(announcements).toContainText([/to list SQUEEZE_IN/]);
    const saved = waitForAction(page, '/kanban/priorities');
    await page.keyboard.press('Space');
    await expect(cardIn(page, 'SQUEEZE_IN', title)).toBeVisible();
    await saved;
    await reload(page);
    await expect(cardIn(page, 'SQUEEZE_IN', title)).toBeVisible();
    await expect(cardIn(page, 'MAYBE_LATER', title)).toHaveCount(0);
  });

  await check('Priorities desktop: the quadrant Add opens the modal and the task lands in that quadrant (openAddTask)', async () => {
    const title = 'Experiment desktop add';
    await quadrant(page, 'DO_FIRST').getByRole('button', {name: 'Add', exact: true}).click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Add Priority Task');
    await dialog.getByPlaceholder('e.g. File tax report').fill(title);
    const saved = waitForAction(page, '/kanban/priorities');
    await dialog.getByRole('button', {name: 'Add to matrix'}).click();
    await saved;
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(cardIn(page, 'DO_FIRST', title)).toBeVisible();
    await reload(page);
    await expect(cardIn(page, 'DO_FIRST', title)).toBeVisible();
  });
  await page.context().close();
}

{
  const page = await newPage(browser, MOBILE);
  await check('Priorities: page opens', async () => openPage(page, '/kanban/priorities'));

  await check('Priorities mobile: tapping a card opens the sheet; Done completes; Undo restores (openMoveToSheet, completeTask, undo)', async () => {
    const title = 'Sort old photos';
    await anyCard(page, title).click();
    const sheet = page.locator('dialog[open]');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', {name: title})).toBeVisible();
    const completed = waitForAction(page, '/kanban/priorities');
    await sheet.getByRole('button', {name: 'Done', exact: true}).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(anyCard(page, title)).toHaveCount(0);
    await expect(toast(page)).toContainText('Marked done');
    await completed;
    const restored = waitForAction(page, '/kanban/priorities');
    await toast(page).getByRole('button', {name: 'Undo'}).click();
    await expect(cardIn(page, 'SQUEEZE_IN', title)).toBeVisible();
    await restored;
  });

  await check('Priorities mobile: sheet → Todo tracks the task (trackTask)', async () => {
    const title = 'Experiment desktop add';
    await anyCard(page, title).click();
    const sheet = page.locator('dialog[open]');
    await expect(sheet).toBeVisible();
    const saved = waitForAction(page, '/kanban/priorities');
    await sheet.getByRole('button', {name: 'Todo', exact: true}).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(anyCard(page, title)).toContainText('★');
    await saved;
    await reload(page);
    await expect(anyCard(page, title)).toContainText('★');
  });

  await check('Priorities mobile: the title-bar + opens the picker modal and the task lands in the chosen quadrant (openAddTask)', async () => {
    const title = 'Experiment mobile add';
    await page.getByTitle('Add priority task').click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('e.g. File tax report').fill(title);
    await dialog.getByRole('button', {name: /maybe later/i}).click();
    const saved = waitForAction(page, '/kanban/priorities');
    await dialog.getByRole('button', {name: 'Add to matrix'}).click();
    await saved;
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(cardIn(page, 'MAYBE_LATER', title)).toBeVisible();
    await expect(toast(page)).toContainText(/Added to/);
    await reload(page);
    await expect(cardIn(page, 'MAYBE_LATER', title)).toBeVisible();
  });
  await page.context().close();
}

await finish(browser);
