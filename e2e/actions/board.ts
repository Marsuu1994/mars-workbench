/**
 * The board's controls, at either width: where desktop and mobile differ
 * (design/specs/board.md › Backlog), the helper takes `isMobile` so a test
 * is written once and runs in both projects.
 */
import type {Locator, Page} from '@playwright/test';
import {ARM_DEBOUNCE_MS} from '@/components/domain/board/taskCardConstants';
import {expect, waitForServerAction} from '../fixtures';

/** The board's drop zones; BACKLOG is the desktop panel's. */
type BoardStatus = 'BACKLOG' | 'TODO' | 'DONE';

/** A board column by status (the drop zones are keyed by it), or the desktop backlog's panel. */
export const findBoardColumn = (page: Page, status: BoardStatus) =>
  status === 'BACKLOG'
    ? page.getByRole('region', {name: 'Backlog'})
    : page.locator(`[data-rfd-droppable-id="${status}"]`);

/** A card on the board by its title; Done cards aren't draggable, so not buttons. */
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
 * queue under it. On desktop the card sits in its group's own drop zone.
 */
export const findBacklogGroup = (
  page: Page,
  isMobile: boolean,
  title: string,
) =>
  findCardOf(findBacklogCard(page, isMobile, title)).locator(
    isMobile ? 'xpath=..' : 'xpath=ancestor::*[@data-rfd-droppable-id][1]/..',
  );

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

/** How long one Space press gets to lift the card before the lift is retried. */
const LIFT_TIMEOUT_MS = 1000;

interface KeyboardDrag {
  from: BoardStatus;
  title: string;
  /** The steps across the columns: on desktop Todo, Done and the backlog panel run left to right */
  keys: ('ArrowLeft' | 'ArrowRight' | 'ArrowDown')[];
  to: Exclude<BoardStatus, 'BACKLOG'>;
}

/**
 * Lifts a card with @hello-pangea/dnd's keyboard drag, waiting for dnd's
 * screen-reader announcement.
 *
 * The lift retries until dnd announces it: a Space pressed before dnd has
 * wired the card's drag handle is ignored, and CI's slower runner sometimes
 * presses that early (the run on PR #109 waited 5 s on an empty announcer).
 */
export const liftCard = async (
  page: Page,
  {from, title}: Pick<KeyboardDrag, 'from' | 'title'>,
) => {
  const announcements = page.locator('[aria-live]');
  const card = findBoardColumn(page, from).getByRole('button', {
    name: new RegExp(title),
  });
  await expect(async () => {
    await card.focus();
    await page.keyboard.press('Space');
    await expect(announcements).toContainText([/lifted/], {
      timeout: LIFT_TIMEOUT_MS,
    });
  }).toPass();
};

/** Steps a lifted card across the columns, drops it, and waits for the save. */
export const dropLiftedCard = async (
  page: Page,
  {keys, to}: Pick<KeyboardDrag, 'keys' | 'to'>,
) => {
  const announcements = page.locator('[aria-live]');
  for (const key of keys) await page.keyboard.press(key);
  await expect(announcements).toContainText([new RegExp(`to list ${to}`)]);
  const statusSaved = waitForServerAction(page, '/kanban');
  await page.keyboard.press('Space');
  await expect(announcements).toContainText([/dropped/]);
  await statusSaved;
};

/**
 * @hello-pangea/dnd's keyboard drag: lift the card, step it across the
 * columns, drop it, and wait for the save — each step waiting on dnd's
 * screen-reader announcement.
 */
export const dragCardWithKeyboard = async (page: Page, drag: KeyboardDrag) => {
  await liftCard(page, drag);
  await dropLiftedCard(page, drag);
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
  await page.waitForTimeout(ARM_DEBOUNCE_MS);
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
    new MutationObserver(records => {
      for (const {target, oldValue} of records) {
        if (
          target instanceof Element &&
          target.hasAttribute('data-today-ring') &&
          target.classList.contains('fx-ring-close') &&
          !oldValue?.includes('fx-ring-close')
        ) {
          store[key] += 1;
        }
      }
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
