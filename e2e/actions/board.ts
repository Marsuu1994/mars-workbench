/**
 * The board's controls, at either width: where desktop and mobile differ
 * (design/flows/board.md › Backlog Flow), the helper takes `isMobile` so a
 * test is written once and runs in both projects.
 */
import type {Page} from '@playwright/test';
import {expect} from '../fixtures';

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

/**
 * Today's done count on the progress dashboard: "1 of 3 tasks" beside the
 * ring on desktop, "1/3" in the Today row on mobile.
 */
export const expectTodayDoneCount = (
  page: Page,
  isMobile: boolean,
  doneCount: number,
) =>
  expect(
    page
      .getByText('Today', {exact: true})
      .filter({visible: true})
      .first()
      .locator('..'),
  ).toContainText(
    // The label runs into the count ("Today0 of 1 tasks"), so no \b
    isMobile
      ? new RegExp(`(?<!\\d)${doneCount}/\\d+`)
      : new RegExp(`(?<!\\d)${doneCount} of \\d+ tasks`),
  );
