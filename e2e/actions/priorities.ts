/**
 * The priority matrix's controls, at either width
 * (design/flows/priorities.md › Track This Week Flow).
 */
import type {Page} from '@playwright/test';
import {waitForServerAction} from '../fixtures';

/** A one-off's card on the matrix by its title. */
export const findMatrixCard = (page: Page, title: string) =>
  page.getByRole('button', {name: new RegExp(title)});

/**
 * Puts a one-off on this week's Todo column and waits for the save: hover →
 * "Move task" → Todo on desktop, tap → sheet → Todo on mobile.
 */
export const trackThisWeek = async (
  page: Page,
  isMobile: boolean,
  title: string,
) => {
  const card = findMatrixCard(page, title);
  if (isMobile) {
    await card.click();
  } else {
    await card.hover();
    await card.getByRole('button', {name: 'Move task'}).click();
  }
  const tracked = waitForServerAction(page, '/kanban/priorities');
  await page.getByRole('button', {name: 'Todo', exact: true}).click();
  await tracked;
};
