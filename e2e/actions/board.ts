/**
 * The board's controls, at either width: where desktop and mobile differ
 * (design/flows/board.md › Backlog), the helper takes `isMobile` so a test
 * is written once and runs in both projects.
 */
import type {Locator, Page} from '@playwright/test';
import {expect, waitForServerAction} from '../fixtures';

/** The board's drop zones; BACKLOG is the desktop panel's. */
type BoardStatus = 'BACKLOG' | 'TODO' | 'DONE';

/** A board column by status: the drop zones are keyed by it. */
export const findBoardColumn = (page: Page, status: BoardStatus) =>
  page.locator(`[data-rfd-droppable-id="${status}"]`);

/** A card on the board by its title; Done cards aren't draggable, so not buttons. */
export const findBoardCard = (page: Page, status: BoardStatus, title: string) =>
  findBoardColumn(page, status).getByRole('heading', {name: title});

/** Opens the backlog: the strip's panel on desktop, the pill's sheet on mobile. */
export const openBacklog = async (page: Page) => {
  await page.getByTitle('Open backlog').filter({visible: true}).click();
};

/** A card in the open backlog: the panel on desktop, the sheet on mobile. */
export const findBacklogCard = (page: Page, isMobile: boolean, title: string) =>
  (isMobile
    ? page.getByRole('dialog')
    : page.locator('[data-rfd-droppable-id="BACKLOG"]')
  ).getByRole('heading', {name: title});

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
 * @hello-pangea/dnd's keyboard drag: lift the card, step it across the
 * columns, drop it, and wait for the save — each step waiting on dnd's
 * screen-reader announcement.
 *
 * The lift retries until dnd announces it: a Space pressed before dnd has
 * wired the card's drag handle is ignored, and CI's slower runner sometimes
 * presses that early (the run on PR #109 waited 5 s on an empty announcer).
 */
export const dragCardWithKeyboard = async (
  page: Page,
  {from, title, keys, to}: KeyboardDrag,
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
  for (const key of keys) await page.keyboard.press(key);
  await expect(announcements).toContainText([new RegExp(`to list ${to}`)]);
  const statusSaved = waitForServerAction(page, '/kanban');
  await page.keyboard.press('Space');
  await expect(announcements).toContainText([/dropped/]);
  await statusSaved;
};

/** A column's header count: how many cards it has (COL-1). */
export const findColumnCount = (
  page: Page,
  status: Exclude<BoardStatus, 'BACKLOG'>,
) =>
  findBoardColumn(page, status)
    .locator('xpath=preceding-sibling::div[1]')
    .locator('.badge');

/**
 * The backlog's count (BL-3): on the strip or the pill while it's closed, in
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

/** What the progress dashboard counts: tasks and points, today and this week. */
export interface Progress {
  todayDone: number;
  todayTotal: number;
  todayPoints: number;
  weekDone: number;
  weekPoints: number;
}

const readNumbers = async (locator: Locator) =>
  ((await locator.textContent()) ?? '').match(/\d+/g)?.map(Number) ?? [];

/**
 * Reads the progress dashboard. Desktop shows "1 of 3 tasks" and "2 / 6"
 * points; mobile shows a Today and a Week row, each "1/3" then the points.
 */
export const readProgress = async (
  page: Page,
  isMobile: boolean,
): Promise<Progress> => {
  const label = (text: string) =>
    page.getByText(text, {exact: true}).filter({visible: true}).first();
  if (isMobile) {
    const rowNumbers = async (text: string) => {
      const [counts, points] = await label(text)
        .locator('..')
        .locator('.fx-num')
        .all();
      const [done, total] = await readNumbers(counts);
      const [donePoints] = await readNumbers(points);
      return {done, total, donePoints};
    };
    const today = await rowNumbers('Today');
    const week = await rowNumbers('Week');
    return {
      todayDone: today.done,
      todayTotal: today.total,
      todayPoints: today.donePoints,
      weekDone: week.done,
      weekPoints: week.donePoints,
    };
  }
  const [todayDone, todayTotal] = await readNumbers(
    label('Today').locator('..'),
  );
  const [todayPoints] = await readNumbers(label('Today Points').locator('..'));
  const weekText =
    (await label('Week Progress').locator('xpath=../..').textContent()) ?? '';
  const [, weekDone] = weekText.match(/(\d+) of \d+ tasks/)?.map(Number) ?? [];
  const [weekPoints] = await readNumbers(label('Week Points').locator('..'));
  return {todayDone, todayTotal, todayPoints, weekDone, weekPoints};
};

/** The title of a column's first card: the top of Done is the latest finished. */
export const findTopCardTitle = (
  page: Page,
  status: Exclude<BoardStatus, 'BACKLOG'>,
) => findBoardColumn(page, status).getByRole('heading').first();
