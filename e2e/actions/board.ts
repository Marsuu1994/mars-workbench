/**
 * The board's controls, at either width: where desktop and mobile differ
 * (design/specs/board.md › Backlog), the helper takes `isMobile` so a test
 * is written once and runs in both projects.
 */
import type {Locator, Page} from '@playwright/test';
import {expect, waitForServerAction} from '../fixtures';

/** How long ✓ Complete ignores presses after it appears, in ms (TAP-3). */
const ARM_GUARD_MS = 350;

/** The board's columns; BACKLOG is the desktop panel. */
type BoardStatus = 'BACKLOG' | 'TODO' | 'DONE';

/** A board column's list of cards by status, or the desktop backlog's panel. */
export const findBoardColumn = (page: Page, status: BoardStatus) =>
  status === 'BACKLOG'
    ? page.getByRole('region', {name: 'Backlog'})
    : page.locator(`[data-board-column="${status}"]`);

/** A card on the board by its title; Done cards aren't buttons. */
export const findBoardCard = (page: Page, status: BoardStatus, title: string) =>
  findBoardColumn(page, status).getByRole('heading', {name: title});

/** Opens the backlog: the strip's panel on desktop, the pill's sheet on mobile. */
export const openBacklog = async (page: Page) => {
  await page.getByTitle('Open backlog').filter({visible: true}).click();
};

/** The open backlog: the panel on desktop, the sheet on mobile. */
export const findOpenBacklog = (page: Page, isMobile: boolean) =>
  isMobile ? page.getByRole('dialog') : findBoardColumn(page, 'BACKLOG');

/** A card's title in the open backlog: the panel on desktop, the sheet on mobile. */
export const findBacklogCard = (page: Page, isMobile: boolean, title: string) =>
  findOpenBacklog(page, isMobile).getByRole('heading', {name: title, level: 3});

/**
 * A backlog group around its card's title: the card, and the pile or the
 * queue under it.
 */
export const findBacklogGroup = (
  page: Page,
  isMobile: boolean,
  title: string,
) => findCardOf(findBacklogCard(page, isMobile, title)).locator('xpath=..');

/** The thin sheets under a backlog group's card. */
export const findPileSheets = (group: Locator) =>
  group.locator('[aria-hidden="true"] > i');

/** The backlog's section labels, Habits and Projects, as shown. */
export const findBacklogSections = (page: Page, isMobile: boolean) =>
  findOpenBacklog(page, isMobile).getByRole('heading', {level: 4});

/** Taps a backlog card's ↑ Todo, in the panel or the sheet, and waits for the save. */
export const pullWithTap = async (
  page: Page,
  isMobile: boolean,
  title: string,
) => {
  const pulled = waitForServerAction(page, '/kanban');
  await findCardOf(findBacklogCard(page, isMobile, title))
    .getByRole('button', {name: 'Todo'})
    .click();
  await pulled;
};

/** A column's header count: how many cards it has (COL-6). */
export const findColumnCount = (
  page: Page,
  status: Exclude<BoardStatus, 'BACKLOG'>,
) =>
  findBoardColumn(page, status)
    .locator('xpath=preceding-sibling::div[1]')
    .locator('.badge');

/**
 * The backlog's count (BL-8): on the strip or the pill while it's closed, in
 * the panel's or the sheet's header while it's open.
 */
export const findBacklogCount = (
  page: Page,
  isMobile: boolean,
  isOpen: boolean,
) => {
  if (!isOpen) {
    return page
      .getByTitle('Open backlog')
      .filter({visible: true})
      .locator('.badge');
  }
  return isMobile
    ? page.getByRole('dialog').locator('.badge').first()
    : page
        .getByTitle('Close backlog')
        .filter({visible: true})
        .locator('xpath=..')
        .locator('.badge');
};

/** The card around a board card's title. */
export const findCardOf = (heading: Locator) =>
  heading.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " card ")][1]',
  );

/** What a screen reader hears for a card's dots or path. */
export const readProgressLabel = (card: Locator) =>
  card.getByRole('img').first().getAttribute('aria-label');

/**
 * The fill of each dot or path segment on a card, in order. A done task's
 * mark is filled, so its fill differs from the empty ones'.
 */
export const readMarkFills = (card: Locator) =>
  card.evaluate(element =>
    [
      ...element.querySelectorAll<HTMLElement>(
        '.fx-pip, .flex-1.rounded-selector',
      ),
    ]
      .filter(mark => mark.checkVisibility())
      .map(mark => getComputedStyle(mark).backgroundColor),
  );

/** The title of a column's first card: the top of Done is the latest finished. */
export const findTopCardTitle = (
  page: Page,
  status: Exclude<BoardStatus, 'BACKLOG'>,
) => findBoardColumn(page, status).getByRole('heading').first();

/**
 * What a keyframes rule sets a property to at its start, as the page's built
 * stylesheet holds it: '' when the rule holds nothing. The build can leave a
 * keyframe empty, and its animation then still plays and draws nothing, so a
 * class on the element doesn't prove a motion shows.
 */
export const readKeyframesStart = (
  page: Page,
  name: string,
  property: string,
) =>
  page.evaluate(
    ([keyframesName, propertyName]) => {
      const rules = [...document.styleSheets].flatMap(sheet => [
        ...sheet.cssRules,
      ]);
      const keyframes = rules.find(
        (rule): rule is CSSKeyframesRule =>
          rule instanceof CSSKeyframesRule && rule.name === keyframesName,
      );
      const start = keyframes?.findRule('from');
      return start?.style.getPropertyValue(propertyName) ?? '';
    },
    [name, property],
  );

// ─── Tap twice to complete ─────────────────────────────────────────────────

/** A Todo card by its title, selected or not (its name changes when it is). */
export const findTodoCard = (page: Page, title: string) =>
  page
    .locator('[data-todo-card]')
    .filter({has: page.getByRole('heading', {name: title})});

/** Presses a Todo card, which selects it or cancels its selection (A10, A11). */
export const pressTodoCard = (page: Page, title: string) =>
  findTodoCard(page, title).click();

/**
 * Presses the selected card's ✓ Complete (A12) and waits for the save. ✓
 * Complete ignores presses for its first 350 ms (TAP-3), and the save starts
 * once the card has been tossed into today's ring.
 */
export const completeSelectedCard = async (page: Page, title: string) => {
  // A press sooner than this after the select does nothing (TAP-3)
  await page.waitForTimeout(ARM_GUARD_MS);
  const saved = waitForServerAction(page, '/kanban');
  await page.getByRole('button', {name: `Complete ${title}`}).click();
  await saved;
};

/** Selects a Todo card and completes it. */
export const completeTodoCard = async (page: Page, title: string) => {
  await pressTodoCard(page, title);
  await expect(findTodoCard(page, title)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await completeSelectedCard(page, title);
};

// ─── Day rings ─────────────────────────────────────────────────────────────

/** The row of rings, one cell for each day the width shows. */
export const findRingRow = (page: Page) =>
  page.getByRole('group', {name: 'This week, day by day'});

/** Today's cell: the button holding today's ring. */
export const findTodayCell = (page: Page) =>
  findRingRow(page).locator('button:has([data-today-ring])');

/** A day's cell up to today, by its date ("YYYY-MM-DD"). */
export const findDayCell = (page: Page, date: string) =>
  page.locator(`[data-day-cell="${date}"]`);

/** How long a kind's arc is drawn on a cell's ring, in px; 0 when empty. */
export const readArcLength = async (cell: Locator, kind: string) =>
  Number.parseFloat(
    (await cell
      .locator(`[data-arc="${kind}"]`)
      .getAttribute('stroke-dasharray')) ?? '0',
  );

/** The open day's list: the desktop panel, or the mobile sheet. */
export const findDayList = (page: Page, isMobile: boolean) =>
  isMobile ? page.locator('dialog[open]') : page.locator('[data-day-list]');

/** The rows of the open day's list, as their text. */
export const findDayListRows = (page: Page, isMobile: boolean) =>
  findDayList(page, isMobile).getByRole('listitem');

const CELEBRATIONS_KEY = '__e2eRingCelebrations';

/**
 * Counts, on every page load, each time today's cell starts its celebration
 * (fx-ring-close). It ends within a second, so a test that looked for it
 * after a save could miss it; a count can't be missed. Call before opening
 * the page.
 */
export const trackRingCelebrations = (page: Page) =>
  page.addInitScript(key => {
    const store = window as unknown as Record<string, number>;
    store[key] = 0;
    // The class after a change is the next change's old value, or the class
    // now for the last one: by the time the records arrive, a class taken off
    // and put back to restart an animation is already back.
    const hasClose = (value: string | null) =>
      (value ?? '').split(/\s+/).includes('fx-ring-close');
    new MutationObserver(records => {
      records.forEach(({target, oldValue}, index) => {
        if (
          !(target instanceof Element) ||
          !target.hasAttribute('data-today-ring')
        ) {
          return;
        }
        const next = records
          .slice(index + 1)
          .find(later => later.target === target);
        const after = next ? next.oldValue : target.getAttribute('class');
        if (hasClose(after) && !hasClose(oldValue)) store[key] += 1;
      });
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
  }, CELEBRATIONS_KEY);

/** How many times today's ring has celebrated since the page loaded. */
export const countRingCelebrations = (page: Page) =>
  page.evaluate(
    key => (window as unknown as Record<string, number>)[key],
    CELEBRATIONS_KEY,
  );

/**
 * Nothing has celebrated since the page loaded: the count is still 0, and
 * today's ring isn't in its celebration. Call once the page has hydrated,
 * since a celebration on load would start only then.
 */
export const expectNoCelebration = async (page: Page) => {
  expect(await countRingCelebrations(page)).toBe(0);
  await expect(page.locator('[data-today-ring]')).not.toHaveClass(
    /fx-ring-close/,
  );
};
